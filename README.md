# 🧩 Prompt-to-JSON Enhancer

A Chrome extension that converts natural language prompts into structured JSON format, with optional AI enhancement capabilities.

## Features

- **Automatic Prompt Capture**: Detects and captures prompts from popular AI platforms (ChatGPT, Claude, Gemini)
- **Structured JSON Conversion**: Transforms prompts into organized JSON with sections for context, goals, constraints, etc.
- **AI Enhancement**: Optional integration with OpenAI, Anthropic, or Google APIs for enhanced JSON structure
- **Multiple Interfaces**: 
  - Floating button overlay on web pages
  - Dedicated prompt-to-JSON page
  - Extension options page for configuration
- **Export Options**: Copy to clipboard or download as JSON file
- **Keyboard Shortcut**: Ctrl+Shift+J to quickly open the converter

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your browser toolbar

## Usage

### Basic Usage (No API Key Required)

1. Visit any webpage with text content
2. Click the floating "🧩 JSONify" button in the bottom right
3. The extension will automatically capture text from common input fields
4. View the generated JSON structure
5. Copy or download the result

### With AI Enhancement

1. Click the extension icon and select "Options"
2. Choose your AI provider (OpenAI, Anthropic, or Google)
3. Enter your API key
4. Enable "LLM enrichment"
5. Save settings
6. Use the "Enhance with AI" feature for improved JSON structure

### Standalone Page

1. Go to extension options
2. Click "Open Prompt-to-JSON Page"
3. Use the full-featured interface with editing capabilities

## Supported Prompt Sections

The extension recognizes and structures these prompt sections:

- **Goal**: Main objective or task
- **Context**: Background information
- **Audience**: Target audience
- **Tone**: Writing style (formal, casual, etc.)
- **Steps**: Action items or process steps
- **Inputs**: Required input parameters
- **Constraints**: Limitations or requirements
- **Output**: Desired output format
- **Notes**: Additional information

## Example

**Input Prompt:**
```
Goal: Create a blog post about AI
Context: For a tech startup
Audience: Developers and tech enthusiasts
Tone: Professional but approachable

Steps:
- Research the topic
- Create an outline
- Write the content
- Review and edit

Output: Markdown format
```

**Generated JSON:**
```json
{
  "meta": {
    "id": "pj-abc123",
    "source": "prompt-page",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "sensitivity": "low"
  },
  "context": {
    "background": "For a tech startup",
    "audience": "Developers and tech enthusiasts",
    "tone": "professional"
  },
  "problem": {
    "goal": "Create a blog post about AI"
  },
  "solution": {
    "steps": [
      "Research the topic",
      "Create an outline", 
      "Write the content",
      "Review and edit"
    ]
  },
  "output": {
    "format": "markdown"
  }
}
```

## API Configuration

### OpenAI
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Uses GPT-3.5-turbo for enhancement

### Anthropic (Claude)
- Get your API key from [Anthropic Console](https://console.anthropic.com/)
- Uses Claude-3-Sonnet for enhancement

### Google (Gemini)
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Uses Gemini Pro for enhancement

## Privacy & Security

- All processing is done locally by default
- API keys are stored locally in Chrome's sync storage
- No data is sent to external servers unless AI enhancement is explicitly enabled
- AI enhancement only sends the prompt text to your chosen provider

## Files Structure

```
extension/
├── manifest.json          # Extension configuration
├── content.js            # Content script for web page integration
├── transformer.js        # Core prompt-to-JSON logic
├── modal.css            # Styles for floating modal
├── options.html         # Extension options page
├── options.css          # Options page styles
├── options.js           # Options page functionality
├── prompt-page.html     # Standalone converter page
├── prompt-page.css      # Standalone page styles
├── prompt-page.js       # Standalone page functionality
├── icons/               # Extension icons
└── README.md           # This file
```

## Development

To modify or extend the extension:

1. Edit the relevant files
2. Reload the extension in `chrome://extensions/`
3. Test functionality on various websites
4. Use `test-runner.html` for basic functionality testing

## Troubleshooting

**Extension not working on a page:**
- Check if the page allows content scripts
- Try refreshing the page after installing

**API enhancement not working:**
- Verify your API key is correct
- Check your API provider's usage limits
- Ensure you have sufficient credits/quota

**JSON output looks incorrect:**
- The extension uses heuristics to parse prompts
- Try using more structured prompt formats
- Use the edit feature to manually adjust the JSON

## License

MIT License - feel free to modify and distribute.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Version History

- **v1.1.0**: Added AI enhancement, standalone page, improved UI
- **v1.0.0**: Initial release with basic prompt-to-JSON conversion