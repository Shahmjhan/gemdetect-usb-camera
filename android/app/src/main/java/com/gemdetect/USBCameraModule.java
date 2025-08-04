package com.gemdetect;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.util.Size;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class USBCameraModule extends ReactContextBaseJavaModule {
    private static final String TAG = "USBCameraModule";
    private ReactApplicationContext reactContext;
    private CameraManager cameraManager;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private HandlerThread backgroundThread;
    private Handler backgroundHandler;

    public USBCameraModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.cameraManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
    }

    @Override
    public String getName() {
        return "USBCameraModule";
    }

    @ReactMethod
    public void getAvailableCameras(Promise promise) {
        try {
            Log.d(TAG, "🔍 Detecting available cameras...");
            String[] cameraIds = cameraManager.getCameraIdList();
            WritableArray cameras = Arguments.createArray();
            
            for (String cameraId : cameraIds) {
                try {
                    CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);
                    WritableMap cameraInfo = Arguments.createMap();
                    
                    // Get camera facing direction
                    Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                    String cameraType = "unknown";
                    boolean isUSBCamera = false;
                    
                    if (facing != null) {
                        switch (facing) {
                            case CameraCharacteristics.LENS_FACING_FRONT:
                                cameraType = "front";
                                break;
                            case CameraCharacteristics.LENS_FACING_BACK:
                                cameraType = "back";
                                break;
                            case CameraCharacteristics.LENS_FACING_EXTERNAL:
                                cameraType = "external";
                                isUSBCamera = true;
                                Log.d(TAG, "✅ Found USB/External camera: " + cameraId);
                                break;
                        }
                    } else {
                        // If facing is null, it might be a USB camera
                        // USB cameras often don't have LENS_FACING property
                        Log.d(TAG, "🔍 Camera " + cameraId + " has no facing info - might be USB camera");
                        cameraType = "external";
                        isUSBCamera = true;
                    }
                    
                    // Get supported resolutions
                    StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                    WritableArray resolutions = Arguments.createArray();
                    
                    if (map != null) {
                        Size[] sizes = map.getOutputSizes(ImageFormat.JPEG);
                        if (sizes != null) {
                            for (Size size : sizes) {
                                WritableMap resolution = Arguments.createMap();
                                resolution.putInt("width", size.getWidth());
                                resolution.putInt("height", size.getHeight());
                                resolutions.pushMap(resolution);
                            }
                        }
                    }
                    
                    cameraInfo.putString("id", cameraId);
                    cameraInfo.putString("type", cameraType);
                    cameraInfo.putBoolean("isUSBCamera", isUSBCamera);
                    cameraInfo.putArray("resolutions", resolutions);
                    
                    // Additional USB camera detection
                    if (isUSBCamera) {
                        cameraInfo.putString("name", "USB Digital Microscope");
                        cameraInfo.putString("description", "External USB Camera Device");
                    } else {
                        cameraInfo.putString("name", "Phone Camera (" + cameraType + ")");
                        cameraInfo.putString("description", "Built-in " + cameraType + " camera");
                    }
                    
                    cameras.pushMap(cameraInfo);
                    
                } catch (CameraAccessException e) {
                    Log.e(TAG, "❌ Error getting characteristics for camera " + cameraId, e);
                }
            }
            
            Log.d(TAG, "📹 Found " + cameras.size() + " cameras total");
            promise.resolve(cameras);
            
        } catch (CameraAccessException e) {
            Log.e(TAG, "❌ Error getting camera list", e);
            promise.reject("CAMERA_ERROR", "Failed to get camera list: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "❌ Unexpected error", e);
            promise.reject("UNKNOWN_ERROR", "Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void openCamera(String cameraId, Promise promise) {
        if (ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "Camera permission not granted");
            return;
        }

        try {
            Log.d(TAG, "📹 Opening camera: " + cameraId);
            
            startBackgroundThread();
            
            cameraManager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(@NonNull CameraDevice camera) {
                    Log.d(TAG, "✅ Camera opened successfully: " + cameraId);
                    cameraDevice = camera;
                    
                    // Send success event to React Native
                    WritableMap params = Arguments.createMap();
                    params.putString("cameraId", cameraId);
                    params.putString("status", "opened");
                    sendEvent("USBCameraEvent", params);
                    
                    promise.resolve("Camera opened successfully");
                }

                @Override
                public void onDisconnected(@NonNull CameraDevice camera) {
                    Log.w(TAG, "⚠️ Camera disconnected: " + cameraId);
                    camera.close();
                    cameraDevice = null;
                    
                    WritableMap params = Arguments.createMap();
                    params.putString("cameraId", cameraId);
                    params.putString("status", "disconnected");
                    sendEvent("USBCameraEvent", params);
                }

                @Override
                public void onError(@NonNull CameraDevice camera, int error) {
                    Log.e(TAG, "❌ Camera error: " + cameraId + ", error code: " + error);
                    camera.close();
                    cameraDevice = null;
                    
                    WritableMap params = Arguments.createMap();
                    params.putString("cameraId", cameraId);
                    params.putString("status", "error");
                    params.putInt("errorCode", error);
                    sendEvent("USBCameraEvent", params);
                }
            }, backgroundHandler);
            
        } catch (CameraAccessException e) {
            Log.e(TAG, "❌ Failed to open camera", e);
            promise.reject("CAMERA_ERROR", "Failed to open camera: " + e.getMessage());
        }
    }

    @ReactMethod
    public void startPreview(int width, int height, Promise promise) {
        if (cameraDevice == null) {
            promise.reject("NO_CAMERA", "No camera is currently open");
            return;
        }

        try {
            Log.d(TAG, "🎥 Starting camera preview " + width + "x" + height);
            
            // Create ImageReader for capturing frames
            imageReader = ImageReader.newInstance(width, height, ImageFormat.JPEG, 1);
            imageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {
                @Override
                public void onImageAvailable(ImageReader reader) {
                    // Handle captured image
                    Image image = reader.acquireLatestImage();
                    if (image != null) {
                        Log.d(TAG, "📸 Image captured from USB camera");
                        
                        // Convert image to base64 and send to React Native
                        ByteBuffer buffer = image.getPlanes()[0].getBuffer();
                        byte[] bytes = new byte[buffer.remaining()];
                        buffer.get(bytes);
                        
                        String base64Image = android.util.Base64.encodeToString(bytes, android.util.Base64.DEFAULT);
                        
                        WritableMap params = Arguments.createMap();
                        params.putString("imageData", "data:image/jpeg;base64," + base64Image);
                        params.putString("source", "usb_microscope");
                        sendEvent("USBCameraImageCaptured", params);
                        
                        image.close();
                    }
                }
            }, backgroundHandler);

            // Create capture session
            List<Surface> surfaces = Arrays.asList(imageReader.getSurface());
            
            cameraDevice.createCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(@NonNull CameraCaptureSession session) {
                    Log.d(TAG, "✅ Camera capture session configured");
                    captureSession = session;
                    
                    try {
                        // Create capture request
                        CaptureRequest.Builder captureBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                        captureBuilder.addTarget(imageReader.getSurface());
                        
                        // Start repeating capture
                        session.setRepeatingRequest(captureBuilder.build(), null, backgroundHandler);
                        
                        WritableMap params = Arguments.createMap();
                        params.putString("status", "preview_started");
                        sendEvent("USBCameraEvent", params);
                        
                        promise.resolve("Preview started successfully");
                        
                    } catch (CameraAccessException e) {
                        Log.e(TAG, "❌ Failed to start preview", e);
                        promise.reject("PREVIEW_ERROR", "Failed to start preview: " + e.getMessage());
                    }
                }

                @Override
                public void onConfigureFailed(@NonNull CameraCaptureSession session) {
                    Log.e(TAG, "❌ Failed to configure capture session");
                    promise.reject("SESSION_ERROR", "Failed to configure capture session");
                }
            }, backgroundHandler);
            
        } catch (CameraAccessException e) {
            Log.e(TAG, "❌ Error starting preview", e);
            promise.reject("CAMERA_ERROR", "Error starting preview: " + e.getMessage());
        }
    }

    @ReactMethod
    public void captureImage(Promise promise) {
        if (captureSession == null) {
            promise.reject("NO_SESSION", "No active capture session");
            return;
        }

        try {
            Log.d(TAG, "📸 Capturing image from USB microscope...");
            
            CaptureRequest.Builder captureBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
            captureBuilder.addTarget(imageReader.getSurface());
            
            captureSession.capture(captureBuilder.build(), null, backgroundHandler);
            promise.resolve("Image capture initiated");
            
        } catch (CameraAccessException e) {
            Log.e(TAG, "❌ Failed to capture image", e);
            promise.reject("CAPTURE_ERROR", "Failed to capture image: " + e.getMessage());
        }
    }

    @ReactMethod
    public void closeCamera(Promise promise) {
        Log.d(TAG, "🔒 Closing camera...");
        
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }
        
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
        
        stopBackgroundThread();
        
        WritableMap params = Arguments.createMap();
        params.putString("status", "closed");
        sendEvent("USBCameraEvent", params);
        
        promise.resolve("Camera closed successfully");
    }

    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("CameraBackground");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    private void stopBackgroundThread() {
        if (backgroundThread != null) {
            backgroundThread.quitSafely();
            try {
                backgroundThread.join();
                backgroundThread = null;
                backgroundHandler = null;
            } catch (InterruptedException e) {
                Log.e(TAG, "Error stopping background thread", e);
            }
        }
    }

    private void sendEvent(String eventName, WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }
}