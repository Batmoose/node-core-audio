//////////////////////////////////////////////////////////////////////////
// node-core-audio - main module
//////////////////////////////////////////////////////////////////////////
//
// Main javascript audio API
/* ----------------------------------------------------------------------
													Object Structures
-------------------------------------------------------------------------
	
*/
//////////////////////////////////////////////////////////////////////////
// Node.js Exports
var globalNamespace = {};
(function (exports) {
	exports.createNewAudioEngine = function( options ) {
		newAudioEngine= new AudioEngine( options );
		return newAudioEngine;
	};
}(typeof exports === 'object' && exports || globalNamespace));


//////////////////////////////////////////////////////////////////////////
// Namespace (lol)
var SHOW_DEBUG_PRINTS = true;
var MAX_SUPPORTED_CHANNELS = 6;													// We need to allocate our process audio for the max channels, 
																				// so we have to set some reasonable limit																				
var log = function( a ) { if(SHOW_DEBUG_PRINTS) console.log(a); };				// A log function we can turn off
var exists = function(a) { return typeof(a) == "undefined" ? false : true; };	// Check whether a variable exists


//////////////////////////////////////////////////////////////////////////
// Constructor
function AudioEngine( options ) {
	var audioEngineImpl = require( __dirname + "/build/Release/NodeCoreAudio" );

	var defaultOptions = {
		inputChannels: 1,
		outputChannels: 1,
		framesPerBuffer: 1024,
		useMicrophone: true
	};
	
    this.options = options || defaultOptions;
	this.audioEngine = audioEngineImpl.createAudioEngine( this.options );
	this.options = this.audioEngine.getOptions();

	this.audioStreamer;
	
	this.processingCallbacks = [];
	
	this.outputBuffer = [];
	this.tempBuffer = [];
	this.processBuffer = [];
	
	var _this = this;

	function validateOutputBufferStructure( buffer ) {
		if( buffer === undefined ) {
			console.log( "Audio processing function didn't return an output buffer" );
			return false;
		}
		
		if( !_this.audioEngine.getOptions().interleaved ) {

			if( buffer.length > _this.options.inputChannels ) {
				console.log( "Output buffer has info for too many channels" );
				return false;
			} else if( buffer.length < _this.options.inputChannels ) {
				console.log( "Output buffer doesn't have data for enough channels" );
				return false;
			}

			if( typeof(buffer[0]) != "object" ) { 
				console.log( "Output buffer not setup correctly, buffer[0] isn't an array" );
				return false;
			}

			if( typeof(buffer[0][0]) != "number" ) {
				console.log( "Output buffer not setup correctly, buffer[0][0] isn't a number" );
				return false;
			}
		} else {
			if( typeof(buffer[0]) != "number" ) {
				console.log( "Output buffer not setup correctly, buffer[0] isn't a number" );
				return false;
			}
		}

		return true;
	}

	// Allocate a processing buffer for each of our channels
	for( var iChannel = 0; iChannel<MAX_SUPPORTED_CHANNELS; ++iChannel ) {
		this.processBuffer[iChannel] = [];
	}
	
	// Start polling the audio engine for data as fast as we can	
	var _this = this;

	this.processAudio = this.getProcessAudio();

	setInterval( function() {
		if (_this.audioEngine.isBufferEmpty()) {
			// Try to process audio
			var input = _this.audioEngine.read();

			var outputBuffer = _this.processAudio( input );

			if( validateOutputBufferStructure(outputBuffer) )
				_this.audioEngine.write( outputBuffer );
		}
	}, 1 );
} // end AudioEngine()


//////////////////////////////////////////////////////////////////////////
// Returns our main audio processing function
AudioEngine.prototype.getProcessAudio = function() {
	var _this = this;

	var options = this.audioEngine.getOptions(),
		numChannels = options.inputChannels;
	
	var processAudio = function( inputBuffer ) {	

		// If we don't have any processing callbacks, just get out
		if( _this.processingCallbacks.length == 0 )
			return inputBuffer;
			
		var processBuffer = inputBuffer;
			
		//if( !_this.options.interleaved )
		//	deInterleave( inputBuffer, processBuffer, _this.options.framesPerBuffer, numChannels );

		// Call through to all of our processing callbacks
		for( var iCallback = 0; iCallback < _this.processingCallbacks.length; ++iCallback ) {
			processBuffer = _this.processingCallbacks[iCallback]( processBuffer );
		} // end for each callback
		
		
		if( typeof(_this.audioStreamer) != "undefined" ) {
			_this.audioStreamer.streamAudio( processBuffer, _this.options.framesPerBuffer, numChannels );
		}
		
		// Return our output audio to the sound card
		return processBuffer;
	} // end processAudio()
	
	return processAudio;
} // end AudioEngine.getProcessAudio()


/**
 * Sets the fft callback function.
 *
 * @param {Function} callback The callback function.
 */
AudioEngine.prototype.setFFTCallback = function(callback) {
	this.audioEngine.setFFTCallback(callback)
}

//////////////////////////////////////////////////////////////////////////
// Get the engine's options 
AudioEngine.prototype.getOptions = function() {
	this.options = this.audioEngine.getOptions();
	return this.options;
} // end AudioEngine.getOptions()


//////////////////////////////////////////////////////////////////////////
// Get the engine's options 
AudioEngine.prototype.setOptions = function( options ) {
	this.audioEngine.setOptions( options );
	this.options = this.audioEngine.getOptions();
} // end AudioEngine.setOptions()


//////////////////////////////////////////////////////////////////////////
// Add a processing callback 
AudioEngine.prototype.addAudioCallback = function( callback ) {
	this.processingCallbacks.push( callback );
} // end AudioEngine.addAudioCallback()

//////////////////////////////////////////////////////////////////////////
// Returns whether the audio engine is active 
AudioEngine.prototype.isActive = function() {
	return this.audioEngine.isActive();
} // end AudioEngine.isActive()


//////////////////////////////////////////////////////////////////////////
// Returns the sample rate of the audio engine 
AudioEngine.prototype.getSampleRate = function() {
	return this.audioEngine.getSampleRate();
} // end AudioEngine.getSampleRate()


//////////////////////////////////////////////////////////////////////////
// Returns the index of the input audio device 
AudioEngine.prototype.getInputDeviceIndex = function() {
	return this.audioEngine.getInputDeviceIndex();
} // end AudioEngine.getInputDeviceIndex()


//////////////////////////////////////////////////////////////////////////
// Returns the index of the output audio device 
AudioEngine.prototype.getOutputDeviceIndex = function() {
	return this.audioEngine.getOutputDeviceIndex();
} // end AudioEngine.getOutputDeviceIndex()


//////////////////////////////////////////////////////////////////////////
// Returns the name of a given device 
AudioEngine.prototype.getDeviceName = function( deviceId ) {
	return this.audioEngine.getDeviceName( deviceId );
} // end AudioEngine.getDeviceName()

//////////////////////////////////////////////////////////////////////////
// Returns the name of a given device 
AudioEngine.prototype.getDeviceMaxInputChannels = function( deviceId ) {
	return this.audioEngine.getDeviceMaxInputChannels( deviceId );
} // end AudioEngine.getDeviceName()


//////////////////////////////////////////////////////////////////////////
// Returns the total number of audio devices
AudioEngine.prototype.getDeviceMaxOutputChannels = function( deviceId ) {
	return this.audioEngine.getDeviceMaxOutputChannels( deviceId );
} // end AudioEngine.getNumDevices()


//////////////////////////////////////////////////////////////////////////
// Returns the total number of audio devices
AudioEngine.prototype.getNumDevices = function() {
	return this.audioEngine.getNumDevices();
} // end AudioEngine.getNumDevices()


//////////////////////////////////////////////////////////////////////////
// Sets the input audio device
AudioEngine.prototype.setInputDevice = function( deviceId ) {
	return this.audioEngine.setInputDevice( deviceId );
} // end AudioEngine.setInputDevice()


//////////////////////////////////////////////////////////////////////////
// Sets the output audio device
AudioEngine.prototype.setOutputDevice = function( deviceId ) {
	return this.audioEngine.setOutputDevice( deviceId );
} // end AudioEngine.setOutputDevice()


//////////////////////////////////////////////////////////////////////////
// Returns the number of input channels
AudioEngine.prototype.getNumInputChannels = function() {
	return this.audioEngine.getNumInputChannels();
} // end AudioEngine.getNumInputChannels()


//////////////////////////////////////////////////////////////////////////
// Returns the number of output channels
AudioEngine.prototype.getNumOutputChannels = function() {
	return this.audioEngine.getNumOutputChannels();
} // end AudioEngine.getNumOutputChannels()


//////////////////////////////////////////////////////////////////////////
// Read audio samples from the sound card 
AudioEngine.prototype.read = function() {
	return this.audioEngine.read();
} // end AudioEngine.read()


//////////////////////////////////////////////////////////////////////////
// Write some audio samples to the sound card
AudioEngine.prototype.write = function() {
	this.audioEngine.write();
} // end AudioEngine.write()


//////////////////////////////////////////////////////////////////////////
// Splits a 1d buffer into its channel components
function deInterleave( inputBuffer, outputBuffer, numSamplesPerBuffer, numChannels ) {
	// If the number of channels doesn't match, setup the output buffer
	if( inputBuffer.length != outputBuffer.length ) {
		outputBuffer = undefined;
		outputBuffer = [];
		for( var iChannel=0; iChannel<inputBuffer.length; ++iChannel )
			outputBuffer[iChannel] = [];
	}

	if( numChannels < 2 ) {
		outputBuffer[0] = inputBuffer;
		return;
	}

	for( var iChannel = 0; iChannel < numChannels; iChannel += numChannels ) {
		for( var iSample = 0; iSample < numSamplesPerBuffer; ++iSample ) {
			outputBuffer[iChannel][iSample] = inputBuffer[iSample + iChannel];
		} // end for each sample		
	} // end for each channel
} // end deInterleave()


//////////////////////////////////////////////////////////////////////////
// Joins multidimensional array into single buffer
function interleave( inputBuffer, outputBuffer, numSamplesPerBuffer, numChannels ) {
	if( numChannels < 2 ) {
		outputBuffer = inputBuffer;
		return;
	}

	// If the number of channels doesn't match, setup the output buffer
	if( inputBuffer.length != outputBuffer.length ) {
		outputBuffer = undefined;
		outputBuffer = [];
		for( var iChannel=0; iChannel<inputBuffer.length; ++iChannel )
			outputBuffer[iChannel] = [];
	}

	for( var iChannel = 0; iChannel < numChannels; ++iChannel ) {
		if( inputBuffer[iChannel] === undefined ) break;

		for( var iSample = 0; iSample < numSamplesPerBuffer; iSample += numChannels ) {
			outputBuffer[iSample + iChannel] = inputBuffer[iChannel][iSample];
		} // end for each sample position		
	} // end for each channel	

} // end interleave()
