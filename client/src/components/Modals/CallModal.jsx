import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { useSocketStore } from '../../stores/socketStore';
import Avatar from '../Common/Avatar';

const CallModal = () => {
  const { socket, incomingCall, activeCall, clearCall } = useSocketStore();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();

  const isCallActive = !!activeCall;
  const isIncoming = !!incomingCall;
  const callData = activeCall || incomingCall;

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCallActive]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isCallActive]);

  // Handle Socket Events
  useEffect(() => {
    if (callData && !isIncoming && !localStream) {
      startStream(callData.type).catch(err => {
        console.error('Error starting stream for initiator:', err);
        endCall();
      });
    }
  }, [callData, isIncoming, localStream]);

  useEffect(() => {
    if (!socket) return;

    socket.on('call:accepted', async (data) => {
      peerRef.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      localStream?.getTracks().forEach(track => {
        peerRef.current.addTrack(track, localStream);
      });

      peerRef.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      peerRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc:ice-candidate', {
            conversationId: data.conversationId,
            candidate: event.candidate,
          });
        }
      };

      const offer = await peerRef.current.createOffer();
      await peerRef.current.setLocalDescription(offer);
      socket.emit('webrtc:offer', {
        conversationId: data.conversationId,
        offer,
      });
    });

    socket.on('call:rejected', () => {
      endCall();
      alert('Call was rejected.');
    });

    socket.on('webrtc:offer', async (data) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerRef.current.createAnswer();
      await peerRef.current.setLocalDescription(answer);
      socket.emit('webrtc:answer', {
        conversationId: data.conversationId,
        answer,
      });
    });

    socket.on('webrtc:answer', async (data) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    return () => {
      socket.off('call:accepted');
      socket.off('call:rejected');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
    };
  }, [socket, localStream]);

  const startStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices", err);
      // Return a fake stream or null so it doesn't crash completely
      return null;
    }
  };

  const acceptCall = async () => {
    const stream = await startStream(incomingCall.type);
    if (!stream) {
      alert("Could not access camera/microphone.");
      rejectCall();
      return;
    }
    useSocketStore.getState().setActiveCall(incomingCall);
    useSocketStore.getState().setIncomingCall(null);
    
    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    stream.getTracks().forEach(track => {
      peerRef.current.addTrack(track, stream);
    });

    peerRef.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', {
          conversationId: incomingCall.conversationId,
          candidate: event.candidate,
        });
      }
    };

    socket.emit('call:accept', { conversationId: incomingCall.conversationId });
  };

  const rejectCall = () => {
    socket.emit('call:reject', { conversationId: incomingCall.conversationId });
    clearCall();
  };

  const endCall = () => {
    if (callData) {
      socket.emit('call:end', { conversationId: callData.conversationId });
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    setRemoteStream(null);
    clearCall();
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMicMuted;
      setIsMicMuted(!isMicMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callData?.type === 'video') {
      localStream.getVideoTracks()[0].enabled = isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  if (!isCallActive && !isIncoming) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center">
      <div className="bg-wa-dark-400 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl text-white relative border border-gray-700">
        
        {/* INCOMING CALL UI */}
        {isIncoming && !isCallActive && (
          <div className="p-8 flex flex-col items-center">
            <h2 className="text-xl text-gray-300 mb-4">Incoming {incomingCall.type} call...</h2>
            <Avatar src={incomingCall.callerAvatar} alt={incomingCall.callerName} size="xl" className="mb-6 w-24 h-24 shadow-lg" />
            <h3 className="text-2xl mb-8 font-medium">{incomingCall.callerName || 'Unknown Contact'}</h3>
            
            <div className="flex space-x-10">
              <button onClick={rejectCall} className="p-4 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg">
                <PhoneOff className="w-8 h-8 text-white" />
              </button>
              <button onClick={acceptCall} className="p-4 bg-green-500 rounded-full hover:bg-green-600 transition animate-bounce shadow-lg">
                <Phone className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE CALL UI */}
        {isCallActive && (
          <div className="flex flex-col h-[70vh]">
            {callData.type === 'video' ? (
              <div className="flex-1 relative bg-black">
                {remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-gray-400">
                    <p>Connecting...</p>
                  </div>
                )}
                <div className="absolute top-4 right-4 w-32 h-44 bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-wa-dark-400 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-wa-dark-400 opacity-50"></div>
                <Avatar 
                  src={callData.isCaller ? callData.calleeAvatar : callData.callerAvatar} 
                  alt={(callData.isCaller ? callData.calleeName : callData.callerName) || 'Contact'} 
                  size="xl" className="mb-6 w-32 h-32 relative z-10 shadow-2xl" 
                />
                <h3 className="text-3xl font-medium relative z-10">{(callData.isCaller ? callData.calleeName : callData.callerName) || 'Contact'}</h3>
                <p className="text-gray-400 mt-2 relative z-10">{remoteStream ? 'Connected' : 'Connecting...'}</p>
                <audio ref={remoteVideoRef} autoPlay className="hidden" />
              </div>
            )}
            
            <div className="h-24 bg-wa-dark-300 flex items-center justify-center space-x-8 border-t border-gray-700">
              <button onClick={toggleMic} className={`p-4 rounded-full transition ${isMicMuted ? 'bg-gray-700 text-white shadow-inner' : 'bg-gray-600 hover:bg-gray-500 text-white shadow-md'}`}>
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              {callData.type === 'video' && (
                <button onClick={toggleVideo} className={`p-4 rounded-full transition ${isVideoMuted ? 'bg-gray-700 text-white shadow-inner' : 'bg-gray-600 hover:bg-gray-500 text-white shadow-md'}`}>
                  {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
              <button onClick={endCall} className="p-4 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;

