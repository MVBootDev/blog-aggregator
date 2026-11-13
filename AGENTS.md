## Browser Automation

When working inside T3 Code, use its integrated collaborative browser as the default browser automation environment.

- Use the `t3-code` MCP server and its `preview_*` tools.
- Use `preview_status` to discover existing browser tabs.
- Use `preview_snapshot` to inspect page content and interactive elements.
- Use `preview_act` to click, type, scroll, and interact with the page.
- Use `preview_navigate` for navigation.
- Reuse existing relevant tabs rather than opening new browser instances.
- Do not use Computer Use, external Chrome automation, or Playwright unless explicitly requested.
- If native browser interaction fails, report the error instead of silently switching tools.
- Verify interactions using a fresh browser snapshot.