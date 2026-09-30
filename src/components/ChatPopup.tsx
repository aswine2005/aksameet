import {
  DefaultStreamChatGenerics,
  MessageInput,
  MessageList,
  Channel,
  Window,
} from 'stream-chat-react';
import { type Channel as ChannelType } from 'stream-chat';

import Popup from './Popup';
import Spinner from './Spinner';

export const SIDE_PANEL_CLASSNAME =
  'bottom-[5rem] right-4 left-auto h-[calc(100svh-6rem)] animate-none';

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: ChannelType<DefaultStreamChatGenerics>;
  error?: boolean;
  onRetry: () => void;
}

const ChatPopup = ({
  channel,
  error = false,
  isOpen,
  onClose,
  onRetry,
}: ChatPopupProps) => {
  return (
    <Popup
      open={isOpen}
      onClose={onClose}
      title={<h2>In-call messages</h2>}
      className={SIDE_PANEL_CLASSNAME}
    >
      <div className="px-0 pb-3 pt-0 h-[calc(100%-66px)]">
        {channel ? (
          <Channel channel={channel}>
            <Window>
              <MessageList disableDateSeparator />
              <MessageInput noFiles focus={isOpen} />
            </Window>
          </Channel>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-meet-gray">
            <p>Chat couldn&apos;t be loaded.</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-primary font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>
    </Popup>
  );
};

export default ChatPopup;
