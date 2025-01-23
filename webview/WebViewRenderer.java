package com.yourcompany.webviewplugin;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.nio.ByteBuffer;

public class WebViewHandler {
    private WebView webView;
    private Activity activity;

    // 생성자에서 WebView와 Activity를 받음
    public WebViewHandler(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.webView.setWebViewClient(new WebViewClient());
    }

    // WebView의 렌더링 결과를 캡처하고 RAW 데이터로 반환
    public void captureWebViewAndGetRawBitmapData(final WebViewCallback callback) {
        activity.runOnUiThread(() -> {
            Bitmap bitmap = Bitmap.createBitmap(webView.getWidth(), webView.getHeight(), Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            webView.draw(canvas);

            // Bitmap을 RAW 데이터(byte[])로 변환
            int size = bitmap.getWidth() * bitmap.getHeight() * 4; // ARGB_8888: 4 bytes per pixel
            ByteBuffer buffer = ByteBuffer.allocate(size);
            bitmap.copyPixelsToBuffer(buffer);
            byte[] rawBitmapData = buffer.array();

            callback.onComplete(rawBitmapData, bitmap.getWidth(), bitmap.getHeight());
        });
    }

    // WebView 작업이 완료된 후 호출될 콜백 인터페이스
    public interface WebViewCallback {
        void onComplete(byte[] rawBitmapData, int width, int height);
    }
}

//////////////////////////
// WebViewRenderer.java
package com.example.webviewrenderer;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.nio.ByteBuffer;

public class WebViewRenderer {
    private WebView webView;
    private Bitmap bitmap;

    public WebViewRenderer(android.content.Context context) {
        webView = new WebView(context);
        webView.setWebViewClient(new WebViewClient());
        int width = 1024;  // WebView 너비
        int height = 1024; // WebView 높이
        bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        webView.layout(0, 0, width, height);
        webView.getSettings().setBuiltInZoomControls(true);
        webView.getSettings().setDisplayZoomControls(false);
        
    }

    public void loadUrl(String url) {
        webView.loadUrl(url);
    }

    public byte[] captureWebView() {
        Canvas canvas = new Canvas(bitmap);
        webView.draw(canvas);

        int byteCount = bitmap.getByteCount();
        ByteBuffer buffer = ByteBuffer.allocate(byteCount);
        bitmap.copyPixelsToBuffer(buffer);

        byte[] argbData = buffer.array();
        byte[] rgbaData = new byte[byteCount];

        // ARGB → RGBA 변환
        for (int i = 0; i < argbData.length; i += 4) {
            rgbaData[i] = argbData[i + 1];     // R
            rgbaData[i + 1] = argbData[i + 2]; // G
            rgbaData[i + 2] = argbData[i + 3]; // B
            rgbaData[i + 3] = argbData[i];     // A
        }

        return rgbaData;
    }
}
