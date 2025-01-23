package com.yourcompany.webviewplugin;

import android.app.Activity;
import android.graphics.Bitmap;
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

    // WebView 캡처 후 byte 배열로 반환하는 함수
    public void captureWebViewAndGetBitmapBytes(final WebViewCallback callback) {
        activity.runOnUiThread(() -> {
            Bitmap bitmap = Bitmap.createBitmap(webView.getWidth(), webView.getHeight(), Bitmap.Config.ARGB_8888);
            webView.draw(new android.graphics.Canvas(bitmap)); // WebView의 내용을 bitmap으로 캡처

            // Bitmap을 byte 배열로 변환
            int size = bitmap.getByteCount();
            ByteBuffer buffer = ByteBuffer.allocate(size); // ByteBuffer 생성
            bitmap.copyPixelsToBuffer(buffer); // Bitmap 데이터를 ByteBuffer로 복사

            byte[] byteArray = buffer.array(); // ByteBuffer를 byte 배열로 변환

            // 콜백 호출하여 byte 배열 전달
            callback.onComplete(byteArray);
        });
    }

    // WebView 작업이 완료된 후 호출될 콜백 인터페이스
    public interface WebViewCallback {
        void onComplete(byte[] bitmapBytes);
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
