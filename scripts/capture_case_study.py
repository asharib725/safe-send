"""Capture real prototype states at 2x for the case study (assets/case-study/*.webp)."""
import asyncio, io, pathlib
from PIL import Image
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "case-study"; OUT.mkdir(parents=True, exist_ok=True)
URL = "file://" + str(ROOT / "dist" / "index.html")


def save(png, name, width):
    im = Image.open(io.BytesIO(png)).convert("RGB")
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", "WEBP", quality=86, method=6)
    print(name, im.size, (OUT / f"{name}.webp").stat().st_size // 1024, "KB")


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=2)
        await page.goto(URL); await page.wait_for_timeout(800)
        phone = page.locator("#screen")
        shot = lambda: phone.screenshot()

        async def scenario(i):
            await page.locator("#scenarios button").nth(i).click(); await page.wait_for_timeout(2400)

        save(await shot(), "home", 600)
        await scenario(0); save(await shot(), "review-clear", 600)
        await scenario(1); save(await shot(), "review-check-closed", 600)
        await page.locator("#screen .risk__why").click(); await page.wait_for_timeout(350); save(await shot(), "review-check", 600)
        await scenario(2); save(await shot(), "review-stop", 600)
        await page.locator("label.toggle", has_text="Urdu").click(); await page.locator("#screen .risk__why").click(); await page.wait_for_timeout(400)
        save(await shot(), "review-stop-urdu", 600)
        await page.locator("label.toggle", has_text="Urdu").click()
        await page.locator("#screen").get_by_role("button", name="Don't send").click(); await page.wait_for_timeout(800)
        save(await shot(), "stopped", 600)
        await page.get_by_role("tab", name="AI rules").click(); await page.wait_for_timeout(400)
        await page.add_style_tag(content=".top{display:none !important}")
        live = page.locator("#rules section").nth(3)
        save(await live.screenshot(), "ai-live-check", 1400)
        await b.close()

asyncio.run(main())
