package com.example.webviewtotexture;

import android.graphics.SurfaceTexture;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class WebViewToTexture {
    private WebView webView;
    private SurfaceTexture surfaceTexture;
    private Surface surface;

    public WebViewToTexture(int width, int height, int textureId) {
        // Initialize SurfaceTexture with the texture ID provided by Unity
        surfaceTexture = new SurfaceTexture(textureId);
        surfaceTexture.setDefaultBufferSize(width, height);
        surface = new Surface(surfaceTexture);

        // Initialize WebView
        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> {
            webView = new WebView(UnityPlayer.currentActivity);
            webView.setWebViewClient(new WebViewClient());
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setLoadWithOverviewMode(true);
            webView.getSettings().setUseWideViewPort(true);
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

            // Attach WebView to the Surface
            webView.setSurface(surface);
        });
    }

    public void loadUrl(String url) {
        Handler mainHandler = new Handler(Looper.getMainLooper());
        mainHandler.post(() -> {
            if (webView != null) {
                webView.loadUrl(url);
            }
        });
    }

    public void release() {
        if (webView != null) {
            webView.destroy();
        }
        if (surface != null) {
            surface.release();
        }
        if (surfaceTexture != null) {
            surfaceTexture.release();
        }
    }

    public SurfaceTexture getSurfaceTexture() {
        return surfaceTexture;
    }
}
