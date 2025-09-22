# VS Code/Cursor Setup for Space Harrier: Infinite Horizons

This workspace is pre-configured for optimal game development with TypeScript, Three.js, and Vite.

## 🚀 Quick Start

1. **Install Recommended Extensions**: When you open this project, VS Code/Cursor will prompt you to install recommended extensions. Click "Install All" for the best experience.

2. **Start Development**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and run:
   - `Tasks: Run Task` → `npm: dev` to start the development server
   - Or use the integrated terminal: `npm run dev`

## 📦 Recommended Extensions

### Core Development

- **TypeScript** - Language support with strict type checking
- **ESLint** - Code linting and error detection
- **Prettier** - Automatic code formatting
- **Vite** - Build tool integration and syntax highlighting

### Three.js & Game Development

- **Shader (GLSL)** - Syntax highlighting for vertex/fragment shaders
- **WebGL GLSL Editor** - Enhanced shader development
- **Hex Editor** - For binary asset inspection

### Productivity

- **GitLens** - Enhanced Git integration
- **Path Intellisense** - Intelligent path completion
- **Auto Rename Tag** - Synchronized tag editing

## ⚙️ Workspace Settings

### Code Quality

- **Format on Save**: Enabled with Prettier
- **ESLint Auto-fix**: Runs on save
- **TypeScript strict mode**: Enabled for type safety

### File Associations

- `.vert`, `.frag`, `.glsl` files are treated as GLSL shaders
- Proper syntax highlighting for game assets

### Debugging

- **Chrome Debugger**: Pre-configured to debug your Vite dev server
- **Source Maps**: Enabled for accurate debugging

## 🎮 Code Snippets

Type these prefixes and press Tab for instant code templates:

- `three-scene` - Basic Three.js scene setup
- `three-mesh` - Create mesh with geometry and material
- `three-animate` - Animation loop template
- `game-component` - Game component class template
- `glsl-vertex` - GLSL vertex shader template
- `glsl-fragment` - GLSL fragment shader template

## 🔧 Available Tasks

Press `Ctrl+Shift+P` → `Tasks: Run Task`:

- **npm: dev** - Start development server (default build task)
- **npm: build** - Build for production
- **npm: lint** - Run ESLint
- **npm: format** - Format code with Prettier

## 🎯 Development Workflow

1. **Start Dev Server**: `npm run dev`
2. **Write Code**: Use TypeScript in `src/` with full intellisense
3. **Auto-format**: Code formats automatically on save
4. **Debug**: Set breakpoints and debug in Chrome
5. **Build**: `npm run build` when ready for production

## 📁 Project Structure

```
src/
├── core/           # Game engine core
├── components/     # Game components
├── systems/        # Game systems (physics, audio, etc.)
├── assets/         # Static assets
├── shaders/        # GLSL shaders
├── ai/            # Procedural generation & AI
└── utils/         # Utility functions
```

## 🎨 Shader Development

Create `.vert` and `.frag` files in `src/shaders/` with full syntax highlighting and error detection.

---

**Happy coding!** 🚀 Your Space Harrier development environment is ready!
