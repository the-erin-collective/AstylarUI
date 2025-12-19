# Angular 20 Signals-First Application

A modern Angular 20 application built with **zoneless architecture**, **Server-Side Rendering (SSR)**, and **signals-first state management**.

## 🚀 Features

- **Angular 20** - Latest version with cutting-edge features
- **Zoneless Architecture** - Uses Angular's experimental zoneless change detection for better performance
- **Server-Side Rendering (SSR)** - Enabled for better SEO and initial load performance
- **Signals-First Approach** - Leverages Angular signals for reactive state management
- **NgRx Signals Store** - Modern state management with NgRx Signals (beta)
- **TypeScript** - Full TypeScript support with strict mode
- **SCSS** - Modern styling with SCSS preprocessor
- **Responsive Design** - Mobile-first responsive design

## 🛠 Technology Stack

- **Framework**: Angular 20
- **Language**: TypeScript 5.8
- **State Management**: NgRx Signals 20.0.0-beta.0
- **Styling**: SCSS
- **Build Tool**: Angular CLI 20
- **Server**: Express.js (SSR)

## 🔗 Dynamic Routing

The application includes a dynamic routing system that demonstrates signals-based route parameter handling:

### Route Structure
```
/site/:site-id
```

### Example URLs
- `http://localhost:4201/site/dashboard`
- `http://localhost:4201/site/analytics` 
- `http://localhost:4201/site/settings`
- `http://localhost:4201/site/profile`
- `http://localhost:4201/site/admin-123`

### Route Parameter Extraction
The Site Component automatically reads the `site-id` parameter from the URL and makes it available as a signal:

```typescript
// Signal automatically updated when route changes
protected siteId = signal<string>('');

// Computed signal based on route parameter
protected componentStatus = computed(() => 
  this.siteId() ? 'Active - Site Loaded' : 'Waiting for Site ID'
);
```

## 📋 What's Included

### Core Components
- **App Component** - Main application shell with signals integration
- **Counter Store** - NgRx Signals store with computed signals and state mutations
- **Todo Component** - Fully functional todo list demonstrating signal-based component state
- **Site Component** - Dynamic routing component with route parameter extraction

### State Management Features
- ✅ Signal-based reactive state
- ✅ Computed signals for derived state
- ✅ Immutable state updates with NgRx Signals
- ✅ Local component signals
- ✅ Global application store

### UI Features
- 🎨 Modern gradient design
- 📱 Responsive layout
- 🔄 Real-time counter with history tracking
- 📝 Interactive todo list with filtering
- 📊 Live statistics and computed values
- 🔗 Dynamic routing with parameter extraction

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:4200`

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Run SSR server**:
   ```bash
   npm run serve:ssr:astylarui
   ```

## 🏗 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── todo.component.ts      # Signal-based todo component
│   │   └── site.component.ts      # Dynamic routing component
│   ├── store/
│   │   └── counter.store.ts       # NgRx Signals store
│   ├── app.ts                     # Main app component
│   ├── app.html                   # App template
│   ├── app.scss                   # App styles
│   ├── app.config.ts              # App configuration
│   └── app.routes.ts              # Routing configuration
├── main.ts                        # Bootstrap file
├── main.server.ts                 # SSR bootstrap
└── server.ts                      # Express server
```

## 🔧 Key Implementation Details

### Signals Usage
- **Local Signals**: `signal()` for component-level state
- **Computed Signals**: `computed()` for derived values
- **Signal Updates**: `.set()` and `.update()` for state mutations

### NgRx Signals Store
- **Store Definition**: `signalStore()` with features
- **State Management**: `withState()` for initial state
- **Computed Values**: `withComputed()` for derived state
- **Actions**: `withMethods()` for state mutations
- **State Updates**: `patchState()` for immutable updates

### Zoneless Benefits
- 🚀 Better performance - no Zone.js overhead
- 🔄 Explicit change detection with signals
- 📦 Smaller bundle size
- 🛠 Better debugging experience

## 🎯 Future Enhancements

- [ ] Add more complex state management examples
- [ ] Implement signal-based HTTP client
- [ ] Add signal-based forms
- [ ] Create signal-based routing guards
- [ ] Add signal-based animations
- [ ] Implement signal-based error handling

## 📚 Learning Resources

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [NgRx Signals Documentation](https://ngrx.io/guide/signals)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Zoneless Angular](https://angular.dev/guide/experimental/zoneless)

---

**Built with ❤️ using Angular 20 and modern web technologies**
