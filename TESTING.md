# Testing the Timeline Calendar Component

## Quick Start

### Option 1: Run the example app (recommended)

```bash
# From the project root
npm run dev
```

This will:
1. Start the Vite dev server on http://localhost:3000
2. Open the demo in your browser automatically
3. Hot reload on any changes

### Option 2: Run from the example directory

```bash
cd example
npm run dev
```

### Option 3: Build and test the package

```bash
# Build the library
npm run build

# Then run the example
npm run dev
```

## What to Test

### 1. **Smooth Scrolling**
- Use your mouse wheel to scroll left/right
- The calendar should scroll smoothly through time
- Try scrolling in both directions

### 2. **Smooth Continuous Zoom**
- Hold **Ctrl** (or **Cmd** on Mac) and use mouse wheel
- The zoom should be smooth and continuous (no steps)
- The zoom center should follow your mouse cursor position
- Notice how the time grid adjusts automatically based on zoom level

### 3. **Time Formats**
The demo shows different time input formats:
- `Date` objects: `new Date('2025-09-15')`
- ISO strings: `"2025-09-16"`
- End time: `endTime={new Date('2025-09-23')}`

### 4. **Human-Readable Durations**
Check these examples in the code:
- `duration="1 day"`
- `duration="12 hours"`
- `duration="2 days 12 hours"`
- `duration="1 week"`

### 5. **Dynamic Grid**
As you zoom in/out, watch the header:
- At low zoom: Years → Months → Weeks
- At medium zoom: Months → Weeks → Days
- At high zoom: Days → Hours → Minutes

### 6. **State Callbacks**
The demo shows current viewport and zoom level in real-time:
- Viewport range updates as you scroll
- Zoom level (pixels per millisecond) updates as you zoom

## Visual Checks

✅ Grid lines align with header labels
✅ Timeline items position correctly
✅ Items don't overflow their rows
✅ Zoom is smooth without jumps
✅ Scrolling is fluid
✅ Header cells display appropriate time units

## Browser Testing

Test in:
- Chrome/Edge
- Firefox
- Safari

## Keyboard Shortcuts (in browser)

- **Mouse Wheel**: Scroll horizontally
- **Ctrl/Cmd + Wheel**: Zoom in/out
- **Shift + Wheel**: Also scrolls (browser default)

## Development Mode

If you want to modify the library and see changes in real-time:

**Terminal 1** - Watch mode for library:
```bash
npm run dev:watch
```

**Terminal 2** - Run example:
```bash
npm run example
```

Now any changes to the source files will trigger a rebuild and the example will hot reload.

## Common Issues

### Issue: "Module not found"
**Solution**: Make sure you've built the library first:
```bash
npm run build
```

### Issue: Zoom not working
**Solution**: Make sure to hold Ctrl/Cmd while scrolling

### Issue: Nothing displays
**Solution**:
1. Check browser console for errors
2. Verify date ranges are valid
3. Ensure timeline items have proper start times and durations

## Testing Different Scenarios

### Test 1: Large Time Range
```tsx
<TimelineCalendar
  startDate={new Date('2020-01-01')}
  endDate={new Date('2030-12-31')}
/>
```

### Test 2: Short Time Range (hours)
```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01T00:00:00')}
  endDate={new Date('2025-01-01T23:59:59')}
/>
```

### Test 3: Many Items
Add 50+ timeline items to test performance

### Test 4: Custom Theme
Try different color schemes in the theme prop

## TypeScript Validation

The example uses TypeScript, so you'll get:
- Type checking for props
- Autocomplete in your IDE
- Error detection before runtime

Run type check:
```bash
npm run typecheck
```

## Next Steps

Once basic testing works:
1. Try integrating with Material UI (see USAGE.md)
2. Try integrating with Tailwind CSS
3. Test with different time libraries (Day.js, Luxon)
4. Build your own custom timeline component
