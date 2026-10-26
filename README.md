# Eagle Plugin - JXL Format Support

An Eagle format extension plugin that adds support for JPEG XL (JXL) image format, enabling preview and thumbnail generation in Eagle App.

## What is JXL?

JPEG XL (JXL) is a next-generation image format that offers:
- Better compression than JPEG (up to 60% smaller file sizes)
- Lossless compression support
- Progressive decoding
- Wide color gamut and HDR support
- Animation support

## Features

- 🖼️ **Preview Support** - View JXL images directly in Eagle
- 🔍 **Thumbnail Generation** - Automatic thumbnail creation for JXL files
- 🚀 **Smart Decoding** - Prioritizes native browser support, falls back to WASM when needed
- 🌍 **Multi-language** - Supports 8 languages
- ⚡ **Optimized Performance** - Uses Web Workers to prevent UI blocking

## How It Works

### Decoding Strategy

The plugin implements a three-tier intelligent fallback system:

1. **Native Browser Decoding** (Fastest)
   - Attempts to use the browser's built-in JXL support
   - Validates that the image loaded correctly with non-zero dimensions
   - Verifies canvas contains actual image data (not empty/transparent)
   - 3-second timeout protection

2. **WASM Decoder** (Universal Support)
   - Activates when native support fails or produces empty images
   - Uses [jxl.js](https://github.com/niutech/jxl.js) WebAssembly decoder
   - Handles all JXL format variants including special encodings
   - Runs in Web Worker to prevent UI blocking
   - 30-second timeout protection

3. **Standard Format Fallback** (Error Recovery)
   - Handles files incorrectly labeled as .jxl
   - Attempts to load as JPG/PNG if JXL decoding fails

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Eagle     │────▶│ jxl2canvas.js│────▶│   Canvas    │
│   Plugin    │     │              │     │   Output    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼────┐
              │  Native   │ │  WASM   │
              │  Decoder  │ │ Worker  │
              └───────────┘ └─────────┘
                             │
                        ┌────▼────┐
                        │jxl_dec  │
                        │ .wasm   │
                        └─────────┘
```

## Installation

### Method 1: Install from Eagle Plugin Store (Recommended)
1. Open Eagle App
2. Go to Plugin Store
3. Search for "JXL Format"
4. Click Install

### Method 2: Manual Installation
1. Download the latest release from [GitHub Releases](https://github.com/eagle-app/eagle-plugin-jxl/releases)
2. Extract the ZIP file
3. In Eagle, go to Menu → Plugins → Developer Mode → Load Plugin
4. Select the extracted folder

## Project Structure

```
eagle-plugin-jxl/
├── manifest.json          # Plugin manifest file
├── jxl2canvas.js         # Core JXL decoder module
├── jxl-header.js         # Reads the JXL header (animation detection)
├── jxl_dec.js            # WebAssembly worker
├── jxl_dec.wasm          # JXL decoder WASM binary
├── thumbnail/
│   └── thumbnail.js      # Thumbnail generator for Eagle
├── viewer/
│   └── index.html        # Preview interface
└── _locales/             # Localization files (8 languages)
```

## Development

### Testing in Eagle

1. Clone this repository
2. Open Eagle App
3. Enable Developer Mode: Menu → Plugins → Developer Mode
4. Load unpacked plugin: Select this plugin folder
5. Import a JXL image to test

### Building from Source

```bash
git clone https://github.com/eagle-app/eagle-plugin-jxl.git
cd eagle-plugin-jxl
# No build step required - plugin runs directly
```

## Performance Optimizations

- **Transferable Objects**: Zero-copy transfer of ArrayBuffers to Web Workers
- **Optimized Canvas Context**: Configured for write-heavy operations
- **Immediate Worker Termination**: Frees memory as soon as decoding completes
- **Smart Timeout Management**: Prevents resource locks and hanging operations

## Compatibility

- **Eagle Version**: 4.0+
- **Supported Platforms**: Windows, macOS, Linux
- **File Extension**: `.jxl`

## Credits

- JXL WebAssembly decoder: [jxl.js](https://github.com/niutech/jxl.js) by niutech
- Original HEIC plugin structure adapted for JXL support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Technical Notes

- Uses native browser JXL support when available (Chrome 91+)
- Falls back to WebAssembly decoder for universal compatibility
- Large files may take longer to decode with WASM
- Some exotic JXL variants may require the WASM decoder
- Animated JXL plays in the viewer when decoded natively; the WASM decoder only renders the first frame. Animated items are flagged so Eagle can play them in the grid when "Autoplay GIFs / WebP / AVIF" is enabled in Preferences

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/eagle-app/eagle-plugin-jxl/issues)
- **Eagle Documentation**: [developer.eagle.cool](https://developer.eagle.cool)
- **Plugin API Reference**: [Format Extension Guide](https://developer.eagle.cool/plugin-api/get-started/plugin-types/preview)