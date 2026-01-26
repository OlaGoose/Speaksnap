# SpeakSnap v3 - Feature Documentation

## Overview

SpeakSnap v3 is a comprehensive English learning application that combines AI-powered conversations, intelligent flashcards, and diary writing to create an immersive learning experience.

## Core Features

### 1. Multi-Modal Input System

#### Camera Mode
- **Live Camera Feed**: Access device camera for real-time image capture
- **Environment Detection**: Uses rear camera by default for capturing surroundings
- **Image Optimization**: Automatically resizes images to 1024px max dimension
- **Compression**: JPEG compression at 70% quality for optimal upload speed

#### Voice Mode
- **Audio Recording**: High-quality audio capture using MediaRecorder API
- **Format Detection**: Supports webm, mp4, and fallback formats
- **Visual Feedback**: Animated UI showing recording state
- **Background Blur**: Artistic camera blur during voice mode

#### Upload Mode
- **File Selection**: Choose images from device gallery
- **Format Support**: JPEG, PNG, and other common formats
- **Auto-Processing**: Same optimization pipeline as camera capture

#### Location Context (Optional)
- **GPS Integration**: Capture user's location for context-aware scenarios
- **Privacy First**: Location is optional and clearly indicated
- **Enhanced Realism**: AI uses location data for more accurate scenarios

### 2. AI-Powered Scenario Generation

#### Image Analysis
- **Visual Recognition**: Identifies objects, settings, and context from images
- **Time-Aware**: Considers current time (day/night) for realistic scenarios
- **Location-Aware**: Uses GPS data to identify local landmarks
- **Level Adaptation**: Adjusts difficulty based on user's proficiency level

#### Scenario Structure
- **Location**: Specific place identified from image
- **Situation**: Realistic conversation context
- **Difficulty**: CEFR levels (A1-C2) matched to user level
- **Role Assignment**: Creates believable character (Barista, Local, etc.)
- **Opening Line**: Natural conversation starter
- **User Hints**: 3 contextually appropriate response options

### 3. Real-Time Dialogue System

#### Conversation Flow
- **Natural Dialogue**: AI responds in character with realistic personality
- **Context Retention**: Maintains conversation history throughout session
- **Adaptive Difficulty**: Adjusts language complexity based on user level
- **Feedback System**: Instant evaluation of user responses

#### Feedback Mechanism
- **Score (0-100)**: Quantitative assessment of response quality
- **Comment**: Qualitative feedback on performance
- **Correction**: Grammar and vocabulary corrections when needed
- **Better Alternative**: Native-speaker suggestions for improvement

#### Interactive Features
- **Text Selection**: Select any text in the conversation
  - **Translate**: Instant Chinese translation
  - **Optimize**: Get native-speaker alternative
  - **Save to Flashcard**: Add to study deck
- **Voice Input**: Speech-to-text for hands-free practice
- **Smart Suggestions**: AI-generated response options
- **Auto-Scroll**: Smooth scrolling to latest messages

### 4. Intelligent Flashcard System

#### Card Structure
- **Front**: English term or phrase
- **Back**: Comprehensive learning content
  - Phonetic transcription (IPA)
  - Chinese translation
  - Grammar-focused definition
  - Example sentence
  - Native usage notes
  - YouTube video IDs for visual learning

#### YouTube Integration
- **Video Embedding**: Shows YouTube Shorts/clips demonstrating usage
- **Multiple Videos**: Up to 4-5 videos per card
- **Vertical Navigation**: Swipe up/down to change videos
- **Auto-Play**: Videos start automatically when card is active
- **Immersive Display**: Full-screen video background with text overlay

#### Card Interaction
- **3D Flip Animation**: Smooth CSS3 transform for card flipping
- **Gesture Controls**:
  - Tap to flip
  - Swipe left/right to navigate cards
  - Swipe up/down to change videos (on front)
- **Deck Stack Effect**: Cards layer behind current card
- **Progress Indicator**: Shows position in deck (e.g., "5 / 23")
- **Audio Playback**: Text-to-speech for pronunciation practice
- **Delete Option**: Remove cards from deck

#### Sources
- **Dialogue**: Words saved during conversation practice
- **Diary**: Terms extracted from diary analysis
- **Manual**: User-created cards (future feature)

### 5. Diary Writing with Tiptap

#### Rich Text Editor
- **Tiptap Integration**: Modern WYSIWYG editor
- **Smart Placeholder**: Contextual writing prompts
- **Typography**: Automatic formatting (quotes, dashes, etc.)
- **Auto-Save**: Prevents data loss (future feature)
- **Pattern Suggestions**: Shows learned sentence patterns for inspiration

#### AI Analysis
- **Intent Extraction**: Understands what user wanted to say
- **Semantic Summary**: Clarifies user's intended meaning
- **Native Rewrites**: 3 versions of the same content
  1. **Casual**: Conversational, everyday language
  2. **Professional**: Formal, business-appropriate
  3. **Expressive**: Idiomatic, vivid language
- **Pattern Extraction**: Identifies reusable sentence structures
- **Automatic Flashcards**: Generates 3-5 vocabulary cards

#### Learning Outcomes
- **Grammar Improvement**: See native alternatives to your writing
- **Vocabulary Building**: Discover more natural expressions
- **Pattern Library**: Build a collection of useful structures
- **Progress Tracking**: Review past entries and improvements

### 6. Library & History

#### Scenarios Tab
- **Thumbnail Grid**: Visual preview of saved scenarios
- **Quick Access**: Tap to resume previous conversations
- **Metadata**: Location, difficulty, date stamp
- **Search**: Find scenarios by location or context
- **Empty State**: Encourages first capture with clear CTA

#### Flashcards Tab
- **Full Deck View**: Immersive flashcard browsing
- **Study Mode**: Sequential card review
- **Statistics**: Track cards created, studied, mastered (future)
- **Filtering**: By source (dialogue/diary), date, difficulty (future)

#### Diary Tab
- **Entry List**: All diary entries with summaries
- **Analysis Results**: View rewrites and patterns
- **Flashcard Links**: See generated cards for each entry
- **Timeline View**: Chronological progress visualization

### 7. User Preferences

#### Level Selection
- **Beginner**: A1-A2 (CEFR) - Basic phrases, simple grammar
- **Intermediate**: B1-B2 - Conversational fluency, complex structures
- **Advanced**: C1-C2 - Native-like proficiency, nuanced expressions

#### Adaptive Learning
- AI adjusts:
  - Vocabulary complexity
  - Grammar structures
  - Conversation topics
  - Speaking speed (future voice feature)
  - Feedback detail level

## Technical Features

### AI Provider System

#### Multi-Provider Architecture
1. **Doubao (Primary)**: 字节跳动豆包 AI
   - Fast response times
   - Chinese language optimization
   - Cost-effective for high volume
   - Automatic retry with exponential backoff

2. **OpenAI (Fallback 1)**: GPT-4o-mini
   - High reliability
   - Excellent instruction following
   - JSON mode for structured responses
   - Vision capabilities for image analysis

3. **Gemini (Fallback 2)**: Gemini 2.5 Flash
   - Fast and efficient
   - Multimodal (text, image, audio)
   - Large context window
   - Free tier available

#### Intelligent Routing
- Tries providers in sequence
- Automatic failover on errors
- Logs provider performance
- Configurable via environment variable

### Data Management

#### Current Implementation (localStorage)
- Quick prototyping and testing
- No backend dependency
- Instant data access
- Works offline

#### Future Migration (Supabase)
- **Scenarios**: Store with image URLs
- **Flashcards**: Full card data with metadata
- **Diary Entries**: Text + analysis results
- **User Preferences**: Level, settings, progress
- **Row Level Security**: User data isolation
- **Real-time Sync**: Multi-device support

### Performance Optimizations

#### Image Processing
- Client-side resizing
- Progressive JPEG encoding
- Lazy loading for thumbnails
- CDN delivery (when using Supabase Storage)

#### API Efficiency
- Debounced requests
- Request caching
- Optimistic UI updates
- Background data sync

#### Rendering
- React 19 concurrent features
- Component lazy loading
- Virtual scrolling for lists (future)
- Memoization of expensive computations

### Mobile Optimization

#### Touch Gestures
- Native-feeling swipe interactions
- Haptic feedback (where supported)
- Momentum scrolling
- Pull-to-refresh (future)

#### Responsive Design
- Mobile-first approach
- Desktop mode with device frame
- Safe area handling (notches, rounded corners)
- Landscape support (future)

#### PWA Features (Future)
- Offline functionality
- Home screen installation
- Push notifications
- Background sync

## User Experience Highlights

### Visual Design
- **Color Palette**: Warm neutrals with accent colors
- **Typography**: System fonts for native feel
- **Shadows**: Subtle depth with float effects
- **Animations**: 300-500ms transitions for smoothness
- **Icons**: Lucide React for consistency

### Interaction Patterns
- **Loading States**: Spinners and skeleton screens
- **Error Handling**: Friendly messages with retry options
- **Empty States**: Clear guidance on next actions
- **Success Feedback**: Subtle confirmations (toasts, checkmarks)

### Accessibility
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard access (desktop)
- **Color Contrast**: WCAG AA compliant
- **Focus Indicators**: Clear focus states

## Future Enhancements

### Voice Features
- **Gemini Live API**: Real-time voice conversations
- **Pronunciation Scoring**: Assess pronunciation quality
- **Accent Detection**: Identify and improve accent
- **Voice Cloning**: Practice with custom voices

### Social Features
- **Scenario Sharing**: Share interesting scenarios
- **Leaderboards**: Compete with friends
- **Study Groups**: Collaborative learning
- **Native Speaker Network**: Practice with real people

### Advanced Learning
- **Spaced Repetition**: Scientific card scheduling
- **Progress Analytics**: Detailed learning metrics
- **Personalized Curriculum**: AI-generated study plans
- **Certification Prep**: TOEFL, IELTS, etc.

### Content Expansion
- **Video Lessons**: Structured learning content
- **Podcast Integration**: Learn from audio content
- **News Articles**: Current events practice
- **Literature**: Read classic and modern texts

## Conclusion

SpeakSnap v3 represents a modern approach to language learning, combining:
- Cutting-edge AI technology
- Intuitive mobile UX
- Comprehensive learning features
- Scalable architecture

The result is an immersive, effective, and enjoyable English learning experience that adapts to each user's level and goals.
