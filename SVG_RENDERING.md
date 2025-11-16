# SVG Rendering in Timeline Calendar

The timeline calendar now uses **SVG** for rendering grid lines and header captions, providing better performance and more flexibility for customization.

## Benefits of SVG Rendering

✅ **Better Performance** - Hardware accelerated, efficient rendering
✅ **Scalable** - Crisp lines at any zoom level
✅ **Easy Styling** - Use CSS or inline styles
✅ **Custom Shapes** - Add any SVG elements you want
✅ **Animations** - Smooth transitions and effects

## Default SVG Grid Lines

By default, the grid lines are rendered as SVG `<line>` elements:

```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
>
  {/* Grid lines are automatically rendered as SVG */}
</TimelineCalendar>
```

## Default SVG Header

Header captions are rendered as SVG `<text>` elements with separator lines.

## Custom SVG Grid Lines

You can customize grid line rendering with the `renderGridLine` prop:

```tsx
<TimelineCalendar
  startDate={new Date('2025-01-01')}
  endDate={new Date('2025-12-31')}
  renderGridLine={({ position, isPrimary, type, label }) => (
    <>
      {/* Custom SVG line */}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2="100%"
        stroke={isPrimary ? '#ff0000' : '#cccccc'}
        strokeWidth={isPrimary ? 2 : 1}
        strokeDasharray={isPrimary ? '0' : '5,5'}
      />

      {/* Optional: Add a label at the bottom */}
      {isPrimary && (
        <text
          x={5}
          y="95%"
          fill="#666"
          fontSize={10}
        >
          {label}
        </text>
      )}
    </>
  )}
/>
```

### Example: Dashed Lines for Non-Primary

```tsx
renderGridLine={({ isPrimary }) => (
  <line
    x1={0}
    y1={0}
    x2={0}
    y2="100%"
    stroke={isPrimary ? '#333' : '#ddd'}
    strokeWidth={1}
    strokeDasharray={isPrimary ? '0' : '3,3'}
  />
)}
```

### Example: Gradient Grid Lines

```tsx
<TimelineCalendar
  renderGridLine={({ position, isPrimary }) => (
    <>
      <defs>
        <linearGradient id={`gradient-${position}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#888" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#888" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <line
        x1={0}
        y1={0}
        x2={0}
        y2="100%"
        stroke={`url(#gradient-${position})`}
        strokeWidth={isPrimary ? 2 : 1}
      />
    </>
  )}
/>
```

## Custom SVG Header

Customize header rendering with `renderHeaderCell`:

```tsx
<TimelineCalendar
  renderHeaderCell={({ label, isPrimary, width, position }) => (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isPrimary ? '#e3f2fd' : 'transparent',
      fontWeight: isPrimary ? 'bold' : 'normal'
    }}>
      {label}
    </div>
  )}
/>
```

Note: Custom header cells use SVG `<foreignObject>` to embed HTML/React content.

## Advanced: Custom SVG with Grid Labels

```tsx
renderGridLine={({ position, isPrimary, label, type }) => (
  <g>
    {/* Vertical line */}
    <line
      x1={0}
      y1={0}
      x2={0}
      y2="100%"
      stroke={isPrimary ? '#2196f3' : '#e0e0e0'}
      strokeWidth={isPrimary ? 2 : 0.5}
    />

    {/* Label at top (for major gridlines only) */}
    {isPrimary && (
      <>
        <rect
          x={-30}
          y={5}
          width={60}
          height={20}
          fill="white"
          fillOpacity={0.9}
          rx={3}
        />
        <text
          x={0}
          y={18}
          textAnchor="middle"
          fontSize={11}
          fill="#333"
          fontWeight="600"
        >
          {label}
        </text>
      </>
    )}
  </g>
)}
```

## Performance Tips

1. **Limit custom elements** - Don't add too many SVG elements per grid line
2. **Use CSS variables** - For dynamic theming without re-rendering
3. **Memoize render functions** - Use `useCallback` for `renderGridLine` and `renderHeaderCell`
4. **Batch updates** - SVG handles many elements efficiently

## CSS Styling for SVG

You can style SVG elements with CSS:

```css
/* Style all grid lines */
[data-timeline-grid] line {
  transition: stroke 0.2s;
}

[data-timeline-grid] line:hover {
  stroke: #2196f3;
  stroke-width: 2;
}

/* Style header text */
[data-timeline-header-cell] text {
  font-family: 'Arial', sans-serif;
}

[data-timeline-header-cell][data-primary="true"] text {
  font-weight: bold;
  fill: #1976d2;
}
```

## Example: Time of Day Grid with Colors

```tsx
renderGridLine={({ position, type, timestamp }) => {
  // Color code by time of day
  const hour = new Date(timestamp).getHours();
  let color = '#e0e0e0';

  if (type === 'hour') {
    if (hour >= 9 && hour < 17) color = '#4caf50'; // Work hours: green
    else if (hour >= 6 && hour < 9) color = '#ff9800'; // Morning: orange
    else color = '#2196f3'; // Night: blue
  }

  return (
    <line
      x1={0}
      y1={0}
      x2={0}
      y2="100%"
      stroke={color}
      strokeWidth={type === 'day' ? 2 : 1}
      opacity={0.5}
    />
  );
}}
```

## Exporting SVG

Since the grid is pure SVG, you can easily export it:

```tsx
const svgRef = useRef<SVGSVGElement>(null);

const exportSVG = () => {
  if (svgRef.current) {
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    // Download or use the SVG
  }
};
```

## Browser Compatibility

SVG rendering is supported in all modern browsers:
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- All with excellent performance

---

**Enjoy the power and flexibility of SVG rendering!** 🎨
