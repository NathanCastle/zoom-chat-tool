# Chat Log Formatting Tool

This is a simple tool for taking Zoom chat log exports and producing a format that is convenient to share.

Background/use case/why this exists: As many public meetings have moved online to Zoom, there is a need to export and share Zoom chat logs as public record. While the Zoom chat log (.txt) format is acceptable, it is difficult to work with and format to appear professional. The format is also difficult to integrate into knowledge management systems like Obsidian.md. Finally, some Zoom users use troublesome or inaccurate names, requiring manual cleanup. This tool automates the manual process of producing Google Docs/Microsoft Word/Obsidian ready content from Zoom's .txt export.

Features:

- Static page; no external dependencies
- [Hosted on github pages](https://nathancastle.github.io/zoom-chat-tool/index.html)
- Works offline
- Automatically excludes direct messages
- Make replacements in the formatted export
    - Manually add a replacement (e.g. to change a user's name)
    - Highlight text in the preview pane to quickly replace
    - Replacements are saved in local storage to make repeat jobs easy
- Supports multiple export formats
    - HTML - works well with Google Docs
    - Markdown, including formatting options to support Obsidian/wiki links
- Responsive UI
    - Supports light and dark mode
    - Optimized for desktop, supported on mobile