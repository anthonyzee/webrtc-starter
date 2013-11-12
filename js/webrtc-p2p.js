var p2p=function(constraints, localElement, remoteElement){
	var self=this;
	//this flag determine mode for initiator (true) or initiatee (false)
	var servers = null;
	self.pc = new RTCPeerConnection(servers, {optional: [{RtpDataChannels: true}]});
	self.sdpConstraints = {
		'mandatory': {
			'OfferToReceiveAudio':constraints.audio, 
			'OfferToReceiveVideo':constraints.video 
		}
	};	
	self.localCandidates=[];
	self.remoteCandidates=[];
	self.stranswer="";
	self.stroffer="";
	self.strlocalCandidates="[]";
	self.localElement=localElement;
	self.remoteElement=remoteElement;
	
	if (constraints.audio || constraints.video){
		getUserMedia(constraints, function(stream){
			console.log('getUserMedia');
			attachMediaStream(self.localElement, stream);
			self.pc.addStream(stream);

		}, function() {});
	};
	self.pc.onaddstream=function(e){
		console.log('on add stream');
		attachMediaStream(self.remoteElement, e.stream);
	};	
	//all the webrtc events here starts here
	self.pc.onicecandidate = function(event){
		console.log("ice callback");
		if (event.candidate!=null){
			self.localCandidates.push(event.candidate);
			self.strlocalCandidates=JSON.stringify(self.localCandidates);
			if (self.sendChannel){
				self.onOffer(self.getOffer());
			};
			if (self.receiveChannel){
				self.onAnswer(self.getAnswer());
			};
		};
	};
	
	self.pc.ondatachannel = function(event) {
		console.log('ondatachannel');
		self.receiveChannel = event.channel;
		self.receiveChannel.onopen=function(event){
			console.log('receiveChannel open');
		};
		self.receiveChannel.onclose=function(event){
			console.log('receiveChannel close');
		};			
		self.receiveChannel.onmessage = function(event){
			console.log('receiveChannel receive message');
			document.p2pform.dataReceive.value += event.data;
		};
	};

	self.pc.onconnecting = function(event){
		console.log('onconnecting');
	};
	self.pc.onopen = function(event){
		console.log('onopen');
	};
	self.pc.onremovestream = function(event){
		console.log('onremovestream');
	};
	//events end here

	//workflow start here
	self.create=function(callback){
		console.log('1. create (local)');		
		self.onOffer=callback;

		self.sendChannel = self.pc.createDataChannel("sendDataChannel", {reliable: false});
		self.sendChannel.onopen=function(event){
			console.log('sendchannel open');
		};
		self.sendChannel.onclose=function(event){
			console.log('sendchannel close');
		};	
		self.sendChannel.onmessage = function(event){
			console.log('sendchannel receive message');
			document.p2pform.dataReceive.value += event.data;
		};		
		
		self.pc.createOffer(self.oncreateOffer, function(){}, self.sdpConstraints);
	};
	self.oncreateOffer=function(offer){
		console.log('1.1. oncreateOffer (local)');
		self.pc.setLocalDescription(offer);
		self.stroffer=JSON.stringify(offer);
		//manual emit
		self.onOffer(self.getOffer());
	};
	
	// this procedure accepts string answer and array of candidates and output answer for establishing p2p.
	self.join=function(token, callback){
		console.log('2. join (remote)');
		self.onAnswer=callback;
		
		for (var i=0; i<token.candidates.length; i++){
			self.remoteCandidates.push(token.candidates[i]);
		};
		self.pc.setRemoteDescription(new RTCSessionDescription(token.offer));
		for (var i=0; i<token.candidates.length; i++){
			self.pc.addIceCandidate(new RTCIceCandidate(token.candidates[i]));
		};		
		self.pc.createAnswer(self.oncreateAnswer, function(){}, self.sdpConstraints);	
	};
	self.oncreateAnswer=function(answer){
		console.log('2.1 oncreateAnswer (remote)');
		self.pc.setLocalDescription(answer);
		self.stranswer=JSON.stringify(answer);
		//manual emit
		self.onAnswer(self.getAnswer());
	};
	
	self.answer=function(token){
		console.log('3.1 answer (local)');
		for (var i=0; i<token.candidates.length; i++){
			self.remoteCandidates.push(token.candidates[i]);
		};			
		self.pc.setRemoteDescription(new RTCSessionDescription(token.answer));		
		for (var i=0; i<token.candidates.length; i++){
			self.pc.addIceCandidate(new RTCIceCandidate(token.candidates[i]));
		};
	};
		
	self.send=function(p_msg){		
		if (self.sendChannel){
			self.sendChannel.send(p_msg);
		};
		if (self.receiveChannel){
			self.receiveChannel.send(p_msg);
		};
	};	
	self.close=function(){
		if (self.sendChannel){
			self.sendChannel.close();
		};
		if (self.receiveChannel){
			self.receiveChannel.close();
		};	
		self.pc.close();
	};
	self.getOffer=function(){
		return '{"offer":'+self.stroffer+',"candidates":'+self.strlocalCandidates+'}';
	};
	self.getAnswer=function(){
		return '{"answer":'+self.stranswer+',"candidates":'+self.strlocalCandidates+'}';
	};
};