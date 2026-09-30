import { useBackgroundFilters } from '@stream-io/video-react-sdk';
import clsx from 'clsx';

import IconButton from './IconButton';
import VisualEffects from './icons/VisualEffects';

/**
 * Blur the room behind you. Done on your own device, before the video leaves
 * it -- so the blur protects what the other participants would otherwise see.
 *
 * Hidden where the browser cannot do it rather than shown and broken: the
 * button this replaced was drawn on every tile and did nothing at all.
 */
const BlurToggle = ({ variant }: { variant: 'preview' | 'call' }) => {
  const { isSupported, backgroundFilter, applyBackgroundBlurFilter, disableBackgroundFilter } =
    useBackgroundFilters();
  if (!isSupported) return null;
  const on = backgroundFilter === 'blur';
  const toggle = () => (on ? disableBackgroundFilter() : applyBackgroundBlurFilter('high'));
  return (
    <IconButton
      icon={<VisualEffects />}
      title={on ? 'Turn off background blur' : 'Blur your background'}
      onClick={toggle}
      variant="secondary"
      className={clsx(
        variant === 'call' && 'call-control-button',
        on && '!bg-light-blue !border-light-blue'
      )}
    />
  );
};

export default BlurToggle;
