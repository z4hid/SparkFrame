# SparkFrame

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="SparkFrame Banner" width="100%"/>
  
  **To Live Is to Create, To Create Is to Be**
  
  Transform your stories into visually consistent narratives with AI-powered scene generation, character blueprints, and professional exports.
</div>

## 🎯 What is SparkFrame?

SparkFrame is a comprehensive storytelling platform that bridges the gap between imagination and visual narrative. It combines AI-powered image generation, character consistency tools, and professional export capabilities to help creators build cohesive visual stories.

### Key Benefits
- **Character Consistency**: Create character blueprints that maintain visual identity across all scenes
- **AI-Powered Generation**: Generate cinematic scenes with natural language prompts
- **Professional Exports**: Export polished PDF storybooks and comic page layouts
- **Iterative Editing**: Refine scenes with conversational edits and version control
- **Organized Workflow**: Manage complex stories with storyboards, transitions, and narratives

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/z4hid/SparkFrame.git
   cd SparkFrame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.local.example .env.local
   ```
   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server** (in a new terminal)
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🎨 Features Overview

### 1. Character Blueprints
Create consistent character profiles that persist across all your scenes.

**Features:**
- Character profile generation with AI
- Reference image uploads (up to 3 images)
- Identity locking for visual consistency
- Portrait editing with conversational prompts
- Character management and deletion

**Example Workflow:**
```
1. Navigate to "Characters" page
2. Enter character name: "Anya the Explorer"
3. Add description: "A brave adventurer with auburn hair, green cloak, and leather armor"
4. Upload reference images (optional)
5. Enable identity locking
6. Save blueprint
```

### 2. Scene Generator
Generate cinematic scenes with your characters using natural language prompts.

**Features:**
- Text-to-image generation with character integration
- Style reference images (up to 5)
- Inspirational prompt suggestions
- Multiple character selection
- Automatic scene versioning
- Direct storyboard integration

**Example Prompts:**
```
"Anya stands at the edge of an ancient forest at dusk, mist curling around mossy stones"
"A knight fighting a dragon in a fiery cave with dramatic lighting"
"Maya in a cozy tech studio with neon signs and soft box lighting"
```

**Best Practices:**
- Include camera details: "35mm, low-angle, cinematic"
- Specify lighting: "soft rim lighting, warm highlights"
- Add negative prompts: "no watermark, no text overlays, no distortions"

### 3. Conversational Editor
Refine your scenes with natural language edits while maintaining version history.

**Features:**
- Non-destructive editing
- Complete edit history with timestamps
- One-click version reversion
- Real-time preview updates
- Collapsible sidebar with scene details

**Example Edits:**
```
"Add a glowing sword in her right hand"
"Make it nighttime with a crescent moon"
"Increase the fog density slightly"
"Add warm lantern light from the left"
```

### 4. Storyboard Organization
Organize your scenes into a cohesive narrative with transitions and version control.

**Features:**
- Drag-and-drop scene ordering
- Transition effects (Fade, Slide, Dissolve, None)
- Multiple scene versions per storyboard entry
- Scene deletion and management
- Cinematic playback mode
- Timeline visualization

### 5. Storybook Export (PDF)
Export professional PDF storybooks with AI-generated narratives.

**Features:**
- Auto-generated titles and summaries
- AI narrative suggestions for each scene
- Custom title page creation
- High-quality PDF rendering
- Scene-by-scene layout with images and text
- Professional formatting and styling

**Export Process:**
```
1. Organize scenes in storyboard
2. Add or generate narratives for each scene
3. Set title and summary
4. Click "Export Storybook (PDF)"
5. Download your professional storybook
```

### 6. Comic Export (PNG)
Create comic book layouts with customizable panels and captions.

**Features:**
- Multiple layout options (Classic, Modern, Minimalist)
- Drag-and-drop panel arrangement
- AI-generated captions
- Custom text overlays
- Panel editing with conversational prompts
- Single-page PNG export

**Layout Options:**
- **Classic**: 2-column grid with traditional comic spacing
- **Modern**: 3-column grid with tighter spacing
- **Minimalist**: Single column with generous spacing

### 7. Cinematic Playback
Preview your storyboard as a slideshow with transition effects.

**Features:**
- Full-screen presentation mode
- Transition effect previews
- Progress indicator
- Keyboard navigation
- Perfect for reviews and presentations

## 🛠️ Architecture

SparkFrame is built with modern web technologies and follows a clean, modular architecture:

### Frontend Stack
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom design system
- **React Hot Toast** for notifications
- **HTML2Canvas** and **jsPDF** for exports

### Backend Services
- **Express.js** server for API endpoints
- **Google Gemini 2.5 Flash** for AI generation
- **Local IndexedDB** for data persistence
- **File system** for image caching

### Project Structure
```
SparkFrame/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation with responsive design
│   ├── Footer.tsx      # App footer
│   └── SparkFrameIcon.tsx
├── pages/              # Main application pages
│   ├── HomePage.tsx    # Landing and dashboard
│   ├── GeneratorPage.tsx    # Scene generation
│   ├── BlueprintPage.tsx    # Character creation
│   ├── EditorPage.tsx       # Scene editing
│   ├── StoryboardPage.tsx   # Story organization
│   ├── StorybookExportPage.tsx  # PDF export
│   ├── ComicExportPage.tsx     # Comic layout
│   └── CinematicPlaybackPage.tsx # Slideshow
├── services/           # Business logic and API calls
│   ├── geminiService.ts    # AI generation service
│   └── dbService.ts        # Local data persistence
├── context/            # React context for state management
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types.ts            # TypeScript type definitions
└── server/             # Backend API server
    └── index.js        # Express server with rate limiting
```

## 📚 Usage Examples

### Complete Workflow Example

**1. Create a Character**
```typescript
// Navigate to Characters page
Character: "Anya the Explorer"
Description: "Brave adventurer with auburn hair in a braided ponytail, 
wearing a weathered green cloak over light leather armor. She carries 
a satchel of maps and an ornate compass."
Identity Locked: Yes
```

**2. Generate Scenes**
```typescript
// Scene 1
Prompt: "Anya stands at the edge of an ancient forest at dusk, mist 
curling around mossy stones. Wide-angle, low-angle, 35mm. Soft rim 
lighting, cool ambient fog with warm highlights from fireflies."

// Scene 2  
Prompt: "Anya discovers a glowing magical seed in a hidden grove. 
Close-up shot, 85mm, shallow depth of field. Warm golden light 
emanating from the seed, soft shadows on her face."

// Scene 3
Prompt: "Anya plants the magical seed in fertile soil. Medium shot, 
50mm, natural lighting. Hopeful expression, gentle morning light 
filtering through leaves."
```

**3. Edit and Refine**
```typescript
// In the Editor
Edit: "Add a faint glowing sword in Anya's right hand"
Edit: "Make the magical seed pulse with blue light"
Edit: "Show small sprouts beginning to emerge from the planted seed"
```

**4. Organize Storyboard**
```typescript
// Set transitions between scenes
Scene 1 → Scene 2: Fade
Scene 2 → Scene 3: Dissolve
Scene 3 → End: None

// Add narratives
Scene 1: "Within the hushed, shadowed confines of an old forest, 
Anya's brown eyes held a quiet solemnity as she stood beside the 
ancient stones."

Scene 2: "The magical seed pulsed with ethereal light, promising 
adventures beyond her wildest dreams."

Scene 3: "With hope in her heart, Anya planted the seed, knowing 
that some rewards are worth more than treasure."
```

**5. Export**
```typescript
// Storybook Export
Title: "Anya's Magical Seed"
Summary: "A young hero named Anya embarks on a quest for treasure, 
but finds a magical seed that promises a different kind of reward."
Export Format: PDF

// Comic Export  
Layout: Classic
Panels: 3 scenes arranged in 2x2 grid
Captions: AI-generated for each panel
Export Format: PNG
```

### Performance Tips

**Faster Generation**
- Use shorter, more specific prompts
- Leverage server caching by repeating successful prompts
- Generate characters once, reuse across scenes
- Use style references instead of describing style in every prompt

**Better Results**
- Include camera specifications: "35mm, medium shot, natural lighting"
- Be specific about character placement: "character centered in frame"
- Use negative prompts consistently
- Lock character identity for consistency

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit with descriptive messages**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use the existing component patterns
- Add proper error handling
- Test on different screen sizes
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI generation capabilities
- **Tailwind CSS** for the beautiful design system
- **React ecosystem** for robust frontend tools
- **Open source community** for inspiration and tools

---

<div align="center">
  <strong>Built with ❤️ for storytellers, creators, and dreamers</strong>
  
  [⭐ Star this project](https://github.com/z4hid/SparkFrame) if you find it useful!
</div>
