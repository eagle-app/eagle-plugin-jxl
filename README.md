# Eagle JXL Format Extension

A plugin for [Eagle](https://eagle.cool/) that enables JPEG XL (JXL) image format support with automatic thumbnail generation and preview capabilities.

## Features

- 🚀 **Native Browser Support First** - Utilizes native JXL decoding when available for optimal performance
- 🔧 **WASM Fallback** - Automatically falls back to WebAssembly decoder for unsupported JXL variants
- 🖼️ **Thumbnail Generation** - Automatic thumbnail creation for JXL images in Eagle
- 👁️ **Image Preview** - Built-in viewer for JXL format files
- 🌍 **Multi-language Support** - Available in 8 languages (EN, ZH-TW, ZH-CN, JA, ES, RU, DE, KO)
- ⚡ **Performance Optimized** - Uses Web Workers and transferable objects for efficient memory usage

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

1. Download the plugin from [Releases](https://github.com/yourusername/eagle-plugin-jxl/releases)
2. In Eagle, go to Settings → Plugins
3. Click "Import Plugin" and select the downloaded folder
4. Enable the plugin

## Development

### Prerequisites

- Node.js (for testing)
- Python 3 (for local test server)

### Project Structure

```
eagle-plugin-jxl/
├── manifest.json           # Plugin configuration
├── jxl2canvas.js          # Main decoder module
├── jxl_dec.js             # WebAssembly worker
├── jxl_dec.wasm           # JXL decoder WASM binary
├── thumbnail/
│   └── thumbnail.js       # Thumbnail generator
├── viewer/
│   └── index.html         # JXL viewer interface
└── _locales/              # Internationalization files
```

### Testing

1. Start a local web server:
```bash
python3 -m http.server 8080
```

2. Open http://localhost:8080/test.html in your browser

### Key Components

- **jxl2canvas.js**: Core module that handles the decoding strategy and fallback logic
- **jxl_dec.js/wasm**: WebAssembly-based JXL decoder from [jxl.js](https://github.com/niutech/jxl.js)
- **thumbnail.js**: Generates PNG thumbnails from decoded JXL images
- **viewer/index.html**: Provides the preview interface within Eagle

## Performance Optimizations

- **Transferable Objects**: Zero-copy transfer of ArrayBuffers to Web Workers
- **Optimized Canvas Context**: Configured for write-heavy operations
- **Immediate Worker Termination**: Frees memory as soon as decoding completes
- **Smart Timeout Management**: Prevents resource locks and hanging operations

## Browser Compatibility

- Chrome/Edge 91+ (with experimental JXL support)
- Firefox (with WASM fallback)
- Safari (with WASM fallback)
- Electron-based apps like Eagle

## Credits

- JXL WebAssembly decoder: [jxl.js](https://github.com/niutech/jxl.js) by niutech
- Original HEIC plugin structure adapted for JXL support

## License

MIT License - See [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Known Issues

- Some exotic JXL encoding parameters may require WASM fallback
- Large files (>10MB) may take longer to decode with WASM
- Native browser JXL support is still experimental and may vary

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/yourusername/eagle-plugin-jxl/issues) page.