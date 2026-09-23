from pathlib import Path


APP = Path(__file__).with_name("app.js")


def test_preview_uses_monotonic_render_version():
    src = APP.read_text(encoding="utf-8")
    assert "let previewRenderVersion = 0" in src
    assert "const renderVersion = ++previewRenderVersion" in src
    assert "renderVersion === previewRenderVersion" in src


def test_async_media_draws_are_guarded_before_painting():
    src = APP.read_text(encoding="utf-8")
    # Both video-frame and image callbacks must verify that the frame still
    # belongs to the newest preview pass before drawing to the canvas.
    assert src.count("if (!isCurrent()) return;") >= 2
    assert "drawImage(img, 0, 0, canvas.width, canvas.height)" in src
    assert "drawImage(video, 0, 0, canvas.width, canvas.height)" in src


def test_render_version_advances_before_async_media_work():
    src = APP.read_text(encoding="utf-8")
    version_pos = src.index("const renderVersion = ++previewRenderVersion")
    video_pos = src.index("requestVideoFrameCallback")
    image_pos = src.index("const img = new Image()")
    assert version_pos < video_pos
    assert version_pos < image_pos
