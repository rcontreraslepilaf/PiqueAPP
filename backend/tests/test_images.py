import asyncio
import unittest
from io import BytesIO
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from PIL import Image, PngImagePlugin
from starlette.datastructures import Headers

from app.services.images import read_clean_image, sanitize_image

LIMIT = 8 * 1024 * 1024


def encoded_image(format="PNG", mode="RGB", size=(8, 4), **options):
    output = BytesIO()
    with Image.new(mode, size, "red") as image:
        image.save(output, format=format, **options)
    return output.getvalue()


class ImageSanitizationTests(unittest.TestCase):
    def assert_rejected(self, data, status, limit=LIMIT):
        with self.assertRaises(HTTPException) as caught:
            sanitize_image(data, limit)
        self.assertEqual(caught.exception.status_code, status)

    def test_jpeg_gps_and_orientation_are_removed_after_rotation(self):
        exif = Image.Exif()
        exif[274] = 6
        exif[271] = "Test camera"
        exif[34853] = {1: "S", 2: (33.0, 0.0, 0.0), 3: "W", 4: (70.0, 0.0, 0.0)}
        data = encoded_image("JPEG", exif=exif)
        with Image.open(BytesIO(data)) as original:
            self.assertIn(34853, original.getexif())
        result = sanitize_image(data, LIMIT)
        self.assertEqual((result.extension, result.content_type), (".jpg", "image/jpeg"))
        with Image.open(BytesIO(result.data)) as clean:
            clean.load()
            self.assertEqual(clean.size, (4, 8))
            self.assertEqual(dict(clean.getexif()), {})

    def test_png_metadata_is_removed_and_alpha_is_preserved(self):
        info = PngImagePlugin.PngInfo()
        info.add_text("GPS", "test location")
        info.add_itxt("XML:com.adobe.xmp", "test metadata")
        output = BytesIO()
        with Image.new("RGBA", (8, 4), (12, 34, 56, 70)) as image:
            image.save(output, format="PNG", pnginfo=info)
        result = sanitize_image(output.getvalue(), LIMIT)
        with Image.open(BytesIO(result.data)) as clean:
            clean.load()
            self.assertEqual(clean.getpixel((0, 0)), (12, 34, 56, 70))
            self.assertNotIn("GPS", clean.info)
            self.assertNotIn("XML:com.adobe.xmp", clean.info)
            self.assertEqual(dict(clean.getexif()), {})

    def test_palette_transparency_is_preserved(self):
        output = BytesIO()
        with Image.new("P", (4, 4), 0) as image:
            image.putpalette([255, 0, 0] + [0] * 765)
            image.save(output, format="PNG", transparency=0)
        result = sanitize_image(output.getvalue(), LIMIT)
        with Image.open(BytesIO(result.data)) as clean:
            self.assertEqual(clean.convert("RGBA").getpixel((0, 0))[3], 0)

    def test_fake_png_and_other_formats_are_rejected(self):
        self.assert_rejected(b"<html>not an image</html>", 415)
        self.assert_rejected(encoded_image("GIF"), 415)

    def test_truncated_images_are_rejected(self):
        for format in ("PNG", "JPEG"):
            with self.subTest(format=format):
                data = encoded_image(format)
                self.assert_rejected(data[:len(data) // 2], 415)

    def test_empty_and_oversized_uploads_are_rejected(self):
        self.assert_rejected(b"", 400)
        self.assert_rejected(b"x" * 11, 413, limit=10)

    def test_pixel_limit_is_checked_before_decoding(self):
        with patch("app.services.images.MAX_IMAGE_PIXELS", 20):
            self.assert_rejected(encoded_image(size=(8, 4)), 413)

    def test_large_image_is_resized_without_changing_aspect_ratio(self):
        result = sanitize_image(encoded_image(size=(4200, 2100)), LIMIT)
        with Image.open(BytesIO(result.data)) as clean:
            self.assertEqual(clean.size, (4096, 2048))

    def test_animated_png_is_rejected(self):
        output = BytesIO()
        with Image.new("RGB", (4, 4), "red") as first, Image.new("RGB", (4, 4), "blue") as second:
            first.save(output, format="PNG", save_all=True, append_images=[second], duration=100)
        self.assert_rejected(output.getvalue(), 415)

    def test_real_format_determines_extension_even_if_mime_is_wrong(self):
        file = UploadFile(BytesIO(encoded_image("PNG")), filename="photo.jpg",
                          headers=Headers({"content-type": "image/jpeg"}))
        result = asyncio.run(read_clean_image(file, LIMIT))
        self.assertEqual((result.extension, result.content_type), (".png", "image/png"))

    def test_unsupported_declared_type_is_rejected(self):
        file = UploadFile(BytesIO(encoded_image("PNG")), filename="photo.png",
                          headers=Headers({"content-type": "application/pdf"}))
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(read_clean_image(file, LIMIT))
        self.assertEqual(caught.exception.status_code, 415)


if __name__ == "__main__":
    unittest.main()
