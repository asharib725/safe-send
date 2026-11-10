"""Drive the built prototype in headless Chrome: every scenario, Urdu, failure, manual flow, docs tabs.
Saves screenshots to /home/claude/safesend/shots and prints console errors."""
import asyncio, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "shots"; OUT.mkdir(exist_ok=True)
URL = "file://" + str(ROOT / "dist" / "index.html")


async def main():
    errors = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        page = await b.new_page(viewport={"width": 1440, "height": 960})
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        await page.goto(URL); await page.wait_for_timeout(700)
        shot = lambda name: page.screenshot(path=str(OUT / f"{name}.png"))
        await shot("01-home")

        async def scenario(i):
            await page.locator("#scenarios button").nth(i).click(); await page.wait_for_timeout(2400)

        # scenario 1: family -> clear
        await scenario(0); await shot("02-review-clear")
        # slide via keyboard (accessibility path)
        await page.locator("#screen .slide__knob").focus(); await page.keyboard.press("Enter"); await page.wait_for_timeout(1900)
        await shot("03-success")
        await page.locator("#screen").get_by_role("button", name="Done").click(); await page.wait_for_timeout(500)
        await shot("04-home-after")

        # scenario 2: new number -> check, open why
        await scenario(1); await page.locator("#screen .risk__why").click(); await page.wait_for_timeout(300); await shot("05-review-check-why")

        # scenario 3: scam -> stop, EN then UR
        await scenario(2); await page.locator("#screen .risk__why").click(); await page.wait_for_timeout(300); await shot("06-review-stop")
        await page.locator("label.toggle", has_text="Urdu").click(); await page.wait_for_timeout(400); await shot("07-review-stop-urdu")
        await page.locator("label.toggle", has_text="Urdu").click(); await page.wait_for_timeout(200)
        # tick the box, slide by real drag
        await page.locator("#screen .check").click(); await page.wait_for_timeout(200)
        await shot("08-stop-acknowledged")
        await page.get_by_role("button", name="Don't send").click(); await page.wait_for_timeout(700); await shot("09-stopped")
        await page.get_by_role("button", name="Report this number").click(); await page.wait_for_timeout(500); await shot("10-reported")
        await page.get_by_role("button", name="Back to home").click(); await page.wait_for_timeout(500)

        # failure path with a real pointer drag
        await page.locator("label.toggle", has_text="fail").click()
        await scenario(1)
        knob = page.locator("#screen .slide__knob"); box = await knob.bounding_box(); track = await page.locator("#screen .slide").bounding_box()
        await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2); await page.mouse.down()
        for k in range(1, 21):
            await page.mouse.move(box["x"] + box["width"] / 2 + (track["width"] - box["width"]) * k / 20, box["y"] + box["height"] / 2); await page.wait_for_timeout(12)
        await page.mouse.up(); await page.wait_for_timeout(1900); await shot("11-failed")
        await page.get_by_role("button", name="Back to home").click(); await page.wait_for_timeout(500)

        # manual flow: home -> send -> new number (invalid then valid) -> amount over balance -> fix
        await page.locator(".action--main").click(); await page.wait_for_timeout(500); await shot("12-send-to")
        await page.locator("#screen").get_by_role("button", name="New number").click(); await page.wait_for_timeout(500)
        await page.locator("#screen").get_by_label("Mobile number").fill("12345"); await page.locator("#screen").get_by_role("button", name="Continue").click(); await page.wait_for_timeout(300); await shot("13-new-number-error")
        await page.locator("#screen").get_by_label("Mobile number").fill("0321 0000104"); await page.locator("#screen").get_by_role("button", name="Continue").click(); await page.wait_for_timeout(800)
        for k in "99999": await page.keyboard.press(k)
        await page.wait_for_timeout(400); await shot("14-amount-over")
        for _ in range(5): await page.keyboard.press("Backspace")
        for k in "3500": await page.locator(f"#screen .key[aria-label='{k}']").click()
        await page.wait_for_timeout(300); await shot("15-amount")
        await page.locator("#screen").get_by_role("button", name="Continue").click(); await page.wait_for_timeout(700); await shot("16-review-scanning")
        await page.wait_for_timeout(1800); await shot("17-review-manual")

        # docs
        await page.get_by_role("tab", name="Design system").click(); await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / "20-system.png"), full_page=True)
        await page.get_by_role("tab", name="AI rules").click(); await page.wait_for_timeout(400)
        await page.screenshot(path=str(OUT / "21-rules.png"), full_page=True)

        # mobile viewport
        m = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        m.on("pageerror", lambda e: errors.append(f"mobile pageerror: {e}"))
        await m.goto(URL); await m.wait_for_timeout(600); await m.screenshot(path=str(OUT / "30-mobile-home.png"))
        await m.locator("#scenarios button").nth(2).scroll_into_view_if_needed(); await m.locator("#scenarios button").nth(2).click(); await m.wait_for_timeout(2400)
        await m.evaluate("window.scrollTo(0,0)"); await m.screenshot(path=str(OUT / "31-mobile-stop.png"))
        await b.close()
    print("\n".join(errors) if errors else "no console errors")

asyncio.run(main())
