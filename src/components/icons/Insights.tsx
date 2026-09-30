// An eye within a shield: attention, kept private.
const Insights = ({ width = 24, height = 24, color = '#e3e3e3' }: { width?: number; height?: number; color?: string }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2.5 4.5 5.4v5.7c0 4.6 3.1 8.9 7.5 10.4 4.4-1.5 7.5-5.8 7.5-10.4V5.4L12 2.5Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M7.6 12c1.1-1.9 2.6-2.9 4.4-2.9s3.3 1 4.4 2.9c-1.1 1.9-2.6 2.9-4.4 2.9s-3.3-1-4.4-2.9Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.4" fill={color} />
  </svg>
);

export default Insights;
