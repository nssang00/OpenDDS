import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import java.nio.ByteBuffer;

public class WebViewPlugin {

    private Activity activity;
    private android.webkit.WebView webView;

    public WebViewPlugin(Activity activity, android.webkit.WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    // WebView 캡처 후 RAW 비트맵 데이터를 반환하는 함수
    public void captureWebViewAndGetRawBitmapData(final WebViewCallback callback) {
        // UI 스레드에서 작업을 실행
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                // WebView의 크기만큼 비트맵 생성
                Bitmap bitmap = Bitmap.createBitmap(webView.getWidth(), webView.getHeight(), Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                webView.draw(canvas);  // WebView를 캔버스에 그려서 비트맵에 저장

                // Bitmap을 RAW 데이터(byte[])로 변환
                ByteBuffer buffer = ByteBuffer.allocate(bitmap.getWidth() * bitmap.getHeight() * 4); // ARGB_8888: 4 bytes per pixel
                bitmap.copyPixelsToBuffer(buffer);
                byte[] rawBitmapData = buffer.array();  // RAW 데이터로 변환

                // 콜백 호출하여 결과 전달
                callback.onComplete(rawBitmapData, bitmap.getWidth(), bitmap.getHeight());
            }
        });
    }

    // WebView 캡처 후 결과를 처리할 콜백 인터페이스
    public interface WebViewCallback {
        void onComplete(byte[] bitmapData, int width, int height);
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
