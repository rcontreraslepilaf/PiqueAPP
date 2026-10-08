"""Storage regression checks using temporary files and an in-memory DB stand-in.

Run: python -B -m unittest discover -s tests -v
No application database or real uploaded documents are used.
"""

import os
import unittest
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from PIL import Image


def fixture_png():
    output = BytesIO()
    with Image.new("RGB", (4, 4), "green") as image:
        image.save(output, format="PNG")
    return output.getvalue()

# The route module creates its storage directory on import; isolate that too.
with TemporaryDirectory() as import_storage:
    with patch.dict(os.environ, {"CREDENTIAL_STORAGE_DIR": import_storage}):
        from app.api.v1.endpoints import credentials


class MemorySession:
    def __init__(self):
        self.commits = 0
        self.deleted = []

    def add(self, record):
        if record.id is None:
            record.id = uuid4()

    def commit(self):
        self.commits += 1

    def refresh(self, record):
        pass

    def delete(self, record):
        self.deleted.append(record)


class CredentialDocumentsTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.user = SimpleNamespace(id=uuid4())
        self.other_owner = uuid4()
        self.db = MemorySession()
        self.record = SimpleNamespace(
            id=uuid4(), user_id=self.user.id,
            credential_type="fishing_license", title="Licencia de prueba",
            authority="SERNAPESCA", license_number=None,
            valid_from=None, expires_at=None, document_url=None, notes=None,
        )
        self.url = f"/api/v1/credentials/{self.record.id}"
        self.payload = {
            "credential_type": "fishing_license",
            "title": "Licencia de prueba", "authority": "SERNAPESCA",
        }
        storage_patch = patch.object(credentials, "STORAGE_ROOT", self.root)
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

        # Replace DB lookup only; the actual HTTP routes and storage code run.
        def owned_record(credential_id, current_user, db):
            if credential_id != self.record.id or current_user.id != self.record.user_id:
                raise HTTPException(status_code=404, detail="Credential not found")
            return self.record

        lookup_patch = patch.object(credentials, "get_user_credential", owned_record)
        lookup_patch.start()
        self.addCleanup(lookup_patch.stop)
        app = FastAPI()
        app.include_router(credentials.router, prefix="/api/v1")
        app.dependency_overrides[credentials.get_current_user] = lambda: self.user
        app.dependency_overrides[credentials.get_db] = lambda: self.db
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def file_for(self, owner, name="document.png", data=b"fixture image"):
        key = f"{owner}/{name}"
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return key, target

    def test_creation_rejects_client_document_references(self):
        foreign_key, foreign_file = self.file_for(self.other_owner)
        for value in (foreign_key, f"{self.user.id}/existing.png",
                      "../escape.png", str(foreign_file), "https://example.com/doc.png"):
            with self.subTest(reference=value):
                response = self.client.post("/api/v1/credentials", json={
                    **self.payload, "document_url": value,
                })
                self.assertEqual(response.status_code, 422)
        self.assertEqual(self.db.commits, 0)
        self.assertEqual(foreign_file.read_bytes(), b"fixture image")

    def test_creation_accepts_missing_or_null_document(self):
        for payload in (self.payload, {**self.payload, "document_url": None}):
            response = self.client.post("/api/v1/credentials", json=payload)
            self.assertEqual(response.status_code, 201, response.text)
            self.assertIsNone(response.json()["document_url"])

    def test_read_own_document(self):
        self.record.document_url, _ = self.file_for(self.user.id)
        response = self.client.get(f"{self.url}/document")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"fixture image")

    def test_read_rejects_foreign_reference(self):
        self.record.document_url, _ = self.file_for(self.other_owner)
        self.assertEqual(self.client.get(f"{self.url}/document").status_code, 400)

    def test_read_rejects_traversal_and_absolute_paths(self):
        _, other_file = self.file_for(self.other_owner)
        own_key, own_file = self.file_for(self.user.id)
        for value in (f"{self.user.id}/../{self.other_owner}/document.png",
                      str(other_file), str(own_file),
                      f"{self.user.id}\\..\\{self.other_owner}\\document.png"):
            with self.subTest(reference=value):
                self.record.document_url = value
                self.assertEqual(self.client.get(f"{self.url}/document").status_code, 400)
        self.record.document_url = own_key
        self.assertEqual(self.client.get(f"{self.url}/document").status_code, 200)

    def test_delete_document_does_not_remove_foreign_file(self):
        self.record.document_url, foreign_file = self.file_for(self.other_owner)
        response = self.client.delete(f"{self.url}/document")
        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.record.document_url)
        self.assertTrue(foreign_file.is_file())

    def test_delete_credential_does_not_remove_foreign_file(self):
        self.record.document_url, foreign_file = self.file_for(self.other_owner)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.db.deleted, [self.record])
        self.assertTrue(foreign_file.is_file())

    def test_delete_own_document(self):
        self.record.document_url, own_file = self.file_for(self.user.id)
        response = self.client.delete(f"{self.url}/document")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(own_file.exists())

    def test_upload_replaces_own_document(self):
        self.record.document_url, old_file = self.file_for(self.user.id)
        response = self.client.post(f"{self.url}/document", files={
            "file": ("image.png", fixture_png(), "image/png"),
        })
        self.assertEqual(response.status_code, 200, response.text)
        key = response.json()["document_url"]
        self.assertEqual(Path(key).parts[0], str(self.user.id))
        self.assertEqual((self.root / key).read_bytes(), fixture_png())
        self.assertFalse(old_file.exists())

    def test_upload_repairs_foreign_reference_without_deleting_foreign_file(self):
        self.record.document_url, foreign_file = self.file_for(self.other_owner)
        response = self.client.post(f"{self.url}/document", files={
            "file": ("image.png", fixture_png(), "image/png"),
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertTrue(foreign_file.is_file())
        self.assertEqual(Path(response.json()["document_url"]).parts[0], str(self.user.id))

    def test_read_rejects_symlink_to_foreign_file(self):
        _, foreign_file = self.file_for(self.other_owner)
        own_folder = self.root / str(self.user.id)
        own_folder.mkdir()
        link = own_folder / "link.png"
        try:
            link.symlink_to(foreign_file)
        except OSError as error:
            self.skipTest(f"Symlinks unavailable: {error}")
        self.record.document_url = f"{self.user.id}/link.png"
        self.assertEqual(self.client.get(f"{self.url}/document").status_code, 400)
        self.assertEqual(self.client.delete(f"{self.url}/document").status_code, 204)
        self.assertTrue(foreign_file.is_file())


if __name__ == "__main__":
    unittest.main()
