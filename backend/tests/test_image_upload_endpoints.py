"""Exercise each upload handler with isolated storage and mocked DB access."""

import asyncio
import os
import unittest
from contextlib import ExitStack
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, PngImagePlugin
from starlette.datastructures import Headers

with TemporaryDirectory() as import_storage:
    with patch.dict(os.environ, {
        "CREDENTIAL_STORAGE_DIR": import_storage,
        "TROPHY_STORAGE_DIR": import_storage,
        "PROFILE_STORAGE_DIR": import_storage,
    }):
        from app.api.v1.endpoints import credentials, profile, trophies


class UploadEndpointTests(unittest.TestCase):
    def exercise(self, kind, data, invalid=False):
        user = SimpleNamespace(id=uuid4())
        record = SimpleNamespace(id=uuid4(), document_url=None, avatar_url=None)
        db = Mock()
        db.scalars.return_value.all.return_value = []
        file = UploadFile(BytesIO(data), filename="untrusted.jpg",
                          headers=Headers({"content-type": "image/jpeg"}))
        with TemporaryDirectory() as folder, ExitStack() as stack:
            root = Path(folder)
            if kind == "credential":
                stack.enter_context(patch.object(credentials, "STORAGE_ROOT", root))
                stack.enter_context(patch.object(credentials, "get_user_credential", return_value=record))
                call = credentials.upload_credential_document(
                    record.id, file=file, db=db, current_user=user,
                )
            elif kind == "trophy":
                stack.enter_context(patch.object(trophies, "TROPHY_STORAGE_ROOT", root))
                stack.enter_context(patch.object(trophies, "_owned_trophy", return_value=record))
                call = trophies.upload_trophy_image(
                    record.id, file=file, db=db, current_user=user,
                )
            else:
                stack.enter_context(patch.object(profile, "PROFILE_STORAGE_ROOT", root))
                stack.enter_context(patch.object(profile, "_profile", return_value=record))
                stack.enter_context(patch.object(profile, "_summary", return_value={}))
                call = profile.upload_avatar(file=file, db=db, current_user=user)

            if invalid:
                with self.assertRaises(HTTPException) as caught:
                    asyncio.run(call)
                self.assertEqual(caught.exception.status_code, 415)
                db.commit.assert_not_called()
                self.assertEqual(list(root.rglob("*")), [])
                return

            asyncio.run(call)
            saved = [path for path in root.rglob("*") if path.is_file()]
            self.assertEqual(len(saved), 1)
            self.assertEqual(saved[0].suffix, ".png")
            with Image.open(saved[0]) as image:
                self.assertEqual(image.format, "PNG")
                self.assertEqual(image.getpixel((0, 0)), (10, 20, 30, 80))
                self.assertNotIn("GPS", image.info)
            db.commit.assert_called_once()
            if kind == "trophy":
                media = db.add.call_args.args[0]
                self.assertEqual(media.metadata_json["content_type"], "image/png")

    def test_all_endpoints_save_clean_pixels_with_real_format(self):
        output = BytesIO()
        info = PngImagePlugin.PngInfo()
        info.add_text("GPS", "test location")
        with Image.new("RGBA", (4, 4), (10, 20, 30, 80)) as image:
            image.save(output, format="PNG", pnginfo=info)
        for kind in ("credential", "trophy", "avatar"):
            with self.subTest(endpoint=kind):
                self.exercise(kind, output.getvalue())

    def test_all_endpoints_reject_fake_photos_before_storage_or_commit(self):
        for kind in ("credential", "trophy", "avatar"):
            with self.subTest(endpoint=kind):
                self.exercise(kind, b"this is not a JPEG", invalid=True)


if __name__ == "__main__":
    unittest.main()
