import { useEffect, useState } from 'react';
import {
  VideoPreview,
  useCallStateHooks,
  useConnectedUser,
} from '@stream-io/video-react-sdk';

import {
  AudioInputDeviceSelector,
  AudioOutputDeviceSelector,
  VideoInputDeviceSelector,
} from './DeviceSelector';
import BlurToggle from './BlurToggle';
import IconButton from './IconButton';
import Mic from './icons/Mic';
import MicOff from './icons/MicOff';
import SpeechIndicator from './SpeechIndicator';
import Videocam from './icons/Videocam';
import VideocamOff from './icons/VideocamOff';
import useSoundDetected from '../hooks/useSoundDetected';

const MeetingPreview = () => {
  const user = useConnectedUser();
  const soundDetected = useSoundDetected();
  const [videoPreviewText, setVideoPreviewText] = useState('');
  const [displaySelectors, setDisplaySelectors] = useState(false);
  const [devicesEnabled, setDevicesEnabled] = useState(false);
  const { useCameraState, useMicrophoneState } = useCallStateHooks();
  const {
    camera,
    optimisticIsMute: isCameraMute,
    hasBrowserPermission: hasCameraPermission,
  } = useCameraState();
  const {
    microphone,
    optimisticIsMute: isMicrophoneMute,
    hasBrowserPermission: hasMicrophonePermission,
    status: microphoneStatus,
  } = useMicrophoneState();

  useEffect(() => {
    const enableMicAndCam = async () => {
      try {
        await camera.enable();
      } catch (error) {
        console.error(error);
      }
      try {
        await microphone.enable();
      } catch (error) {
        console.error(error);
      }
      setDevicesEnabled(true);
    };

    enableMicAndCam();
  }, [camera, microphone]);

  useEffect(() => {
    if (hasMicrophonePermission === undefined) return;
    if (
      (hasMicrophonePermission && microphoneStatus) ||
      !hasMicrophonePermission
    ) {
      setDisplaySelectors(true);
    }
  }, [microphoneStatus, hasMicrophonePermission]);

  const toggleCamera = async () => {
    try {
      setVideoPreviewText((prev) =>
        prev === '' || prev === 'Camera is off'
          ? 'Camera is starting'
          : 'Camera is off'
      );
      await camera.toggle();
      setVideoPreviewText((prev) =>
        prev === 'Camera is off' ? 'Camera is starting' : 'Camera is off'
      );
    } catch (error) {
      console.error(error);
    }
  };

  const toggleMicrophone = async () => {
    try {
      await microphone.toggle();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-full max-w-3xl lg:pr-2 lg:mt-8">
      <div className="relative w-full rounded-2xl max-w-185 aspect-video mx-auto shadow-2xl overflow-hidden border-4 border-white/20">
        {/* Background with gradient */}
        <div className="absolute z-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
        
        {/* Gradient overlay */}
        <div className="absolute z-2 bg-gradient-overlay left-0 w-full h-full" />
        
        {/* Video preview */}
        <div className="absolute w-full h-full [&>div]:w-auto [&>div]:h-auto z-1 flex items-center justify-center overflow-hidden [&_video]:-scale-x-100">
          <VideoPreview
            DisabledVideoPreview={() => DisabledVideoPreview(videoPreviewText)}
          />
        </div>
        
        {devicesEnabled && (
          <div className="z-3 absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
            {/* Microphone control */}
            <div className="relative group">
              <IconButton
                icon={isMicrophoneMute ? <MicOff /> : <Mic />}
                title={
                  isMicrophoneMute ? 'Turn on microphone' : 'Turn off microphone'
                }
                onClick={toggleMicrophone}
                active={isMicrophoneMute}
                alert={!hasMicrophonePermission}
                variant="secondary"
              />
              {!hasMicrophonePermission && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </div>
            
            {/* Camera control */}
            <div className="relative group">
              <IconButton
                icon={isCameraMute ? <VideocamOff /> : <Videocam />}
                title={isCameraMute ? 'Turn on camera' : 'Turn off camera'}
                onClick={toggleCamera}
                active={isCameraMute}
                alert={!hasCameraPermission}
                variant="secondary"
              />
              {!hasCameraPermission && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </div>
            {hasCameraPermission && <BlurToggle variant="preview" />}
          </div>
        )}
        
        {/* Speech Indicator */}
        {microphoneStatus && microphoneStatus === 'enabled' && (
          <div className="z-2 absolute bottom-4 left-4 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg">
            <SpeechIndicator isSpeaking={soundDetected} />
          </div>
        )}
        
        {/* User name with badge */}
        {devicesEnabled && hasCameraPermission && (
          <div className="z-3 absolute left-4 top-4 flex items-center gap-2">
            <div className="max-w-94 px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg">
              <span className="text-white text-sm font-semibold truncate">
                {user?.name}
              </span>
            </div>
          </div>
        )}
        
      </div>
      
      {/* Device Selectors */}
      <div className="hidden lg:flex h-17 items-center gap-2 mt-6 justify-center">
        {displaySelectors && (
          <div className="flex gap-3 bg-white/70 backdrop-blur-xl p-3 rounded-2xl shadow-lg border border-white/20">
            <AudioInputDeviceSelector disabled={!hasMicrophonePermission} />
            <AudioOutputDeviceSelector disabled={!hasMicrophonePermission} />
            <VideoInputDeviceSelector disabled={!hasCameraPermission} />
          </div>
        )}
      </div>
    </div>
  );
};

export const DisabledVideoPreview = (videoPreviewText: string) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-4xl shadow-xl">
        📹
      </div>
      <div className="text-xl font-semibold text-white text-center">
        {videoPreviewText || 'Camera is starting...'}
      </div>
      <div className="text-sm text-gray-400 text-center max-w-sm">
        Make sure your camera is connected and you&apos;ve granted permissions
      </div>
    </div>
  );
};

export default MeetingPreview;
