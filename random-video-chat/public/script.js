const socket = io.connect();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const nextChatButton = document.getElementById('nextChat');
let peerConnection;
let localStream;

// Get user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
  })
  .catch(error => console.error('Error accessing media devices.', error));

// Create peer connection
function createPeerConnection() {
  peerConnection = new RTCPeerConnection();
  peerConnection.addStream(localStream);

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', { candidate: event.candidate });
    }
  };
}

// Start a chat session
socket.on('match', (data) => {
  createPeerConnection();

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer });
  });
});

// Answer incoming offer
socket.on('offer', (data) => {
  createPeerConnection();

  peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  peerConnection.createAnswer().then(answer => {
    peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer });
  });
});

// Add ICE candidate
socket.on('candidate', (data) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});

// Handle "Next" button click
nextChatButton.addEventListener('click', () => {
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
  socket.emit('findNewPeer');
});
