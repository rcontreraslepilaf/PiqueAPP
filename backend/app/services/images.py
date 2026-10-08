"""Validate uploaded photos and encode pixels without client metadata."""

from dataclasses import dataclass
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

MAX_IMAGE_PIXELS = 24_000_000
MAX_IMAGE_DIMENSION = 4096
FORMATS = {"JPEG": (".jpg", "image/jpeg"), "PNG": (".png", "image/png")}


@dataclass(frozen=True)
class CleanImage:
    data: bytes
    extension: str
    content_type: str


def sanitize_image(data: bytes, max_bytes: int) -> CleanImage:
    if not data:
        raise HTTPException(status_code=400, detail="The image is empty")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="The image exceeds the upload size limit")

    try:
        with Image.open(BytesIO(data), formats=list(FORMATS)) as probe:
            image_format = probe.format
            if probe.width * probe.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="The image exceeds the 24 megapixel limit")
            if getattr(probe, "n_frames", 1) != 1:
                raise HTTPException(status_code=415, detail="Only static JPG and PNG images are allowed")
            probe.verify()

        # Verification invalidates the decoder; reopen and decode all pixels.
        with Image.open(BytesIO(data), formats=list(FORMATS)) as source:
            source.load()
            with ImageOps.exif_transpose(source) as oriented:
                oriented.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)
                alpha = "A" in oriented.getbands() or "transparency" in oriented.info
                mode = "RGBA" if image_format == "PNG" and alpha else "RGB"
                with oriented.convert(mode) as pixels:
                    # A fresh image contains only pixels: no EXIF, XMP, comments,
                    # PNG text chunks, camera identity or embedded thumbnails.
                    with Image.new(mode, pixels.size) as clean:
                        clean.paste(pixels)
                        output = BytesIO()
                        if image_format == "JPEG":
                            clean.save(output, format="JPEG", quality=92, exif=b"")
                        else:
                            clean.save(output, format="PNG")
                        result = output.getvalue()
    except Image.DecompressionBombError as exc:
        raise HTTPException(status_code=413, detail="The image resolution is too large") from exc
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise HTTPException(status_code=415, detail="Invalid or corrupted JPG/PNG image") from exc

    if len(result) > max_bytes:
        raise HTTPException(status_code=413, detail="The processed image exceeds the upload size limit")
    extension, content_type = FORMATS[image_format]
    return CleanImage(result, extension, content_type)


async def read_clean_image(file: UploadFile, max_bytes: int) -> CleanImage:
    if (file.content_type or "").lower() not in {item[1] for item in FORMATS.values()}:
        raise HTTPException(status_code=415, detail="Only JPG and PNG images are allowed")
    data = await file.read(max_bytes + 1)
    # Decoding/encoding is CPU work; keep the async event loop responsive.
    return await run_in_threadpool(sanitize_image, data, max_bytes)
