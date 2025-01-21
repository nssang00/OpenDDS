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
