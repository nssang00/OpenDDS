using UnityEngine;

public class WebViewTextureHandler : MonoBehaviour
{
    private AndroidJavaObject webViewPlugin;
    private Texture2D webViewTexture;
    private bool isProcessing = false;

    void Start()
    {
        // AndroidJavaObject로 WebViewPlugin 객체 가져오기
        using (AndroidJavaClass pluginClass = new AndroidJavaClass("com.yourcompany.webviewplugin.WebViewPlugin"))
        {
            using (AndroidJavaObject activity = GetActivity())
            {
                AndroidJavaObject webView = GetWebView(); // WebView를 가져오는 코드 필요
                webViewPlugin = new AndroidJavaObject("com.yourcompany.webviewplugin.WebViewPlugin", activity, webView);
            }
        }
    }

    void Update()
    {
        if (!isProcessing)
        {
            isProcessing = true;
            RequestWebViewFrame();
        }
    }

    private void RequestWebViewFrame()
    {
        // WebView 캡처 및 콜백 처리
        webViewPlugin.Call("captureWebViewAndGetRawBitmapData", new WebViewCallback(this));
    }

    // 콜백 메서드: WebView 캡처 완료 후 호출
    public void OnWebViewCaptured(byte[] bitmapData, int width, int height)
    {
        if (webViewTexture == null || webViewTexture.width != width || webViewTexture.height != height)
        {
            // WebView 캡처 후 Texture2D 초기화
            webViewTexture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            GetComponent<Renderer>().material.mainTexture = webViewTexture;
        }

        // 비트맵 데이터를 Texture2D에 로드
        webViewTexture.LoadRawTextureData(bitmapData);
        webViewTexture.Apply();

        // 처리 완료 표시
        isProcessing = false;
    }

    // Java에서 호출되는 콜백을 위한 C# 클래스
    public class WebViewCallback : AndroidJavaProxy
    {
        private WebViewTextureHandler textureHandler;

        public WebViewCallback(WebViewTextureHandler handler) : base("com.yourcompany.webviewplugin.WebViewPlugin$WebViewCallback")
        {
            textureHandler = handler;
        }

        // Java에서 호출될 콜백 메서드
        public void onComplete(byte[] bitmapData, int width, int height)
        {
            textureHandler.OnWebViewCaptured(bitmapData, width, height);
        }
    }

    // 현재 Activity를 반환하는 메서드 (Unity에서 호출할 수 있도록)
    private AndroidJavaObject GetActivity()
    {
        using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
        {
            return unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        }
    }

    // WebView를 가져오는 메서드 (여기서는 예시로 빈 객체 사용)
    private AndroidJavaObject GetWebView()
    {
        return new AndroidJavaObject("android.webkit.WebView", GetActivity());
    }
}
///////////////////////////////////
// WebViewToTexture.cs
using UnityEngine;

public class WebViewToTexture : MonoBehaviour
{
    private AndroidJavaObject webViewRenderer;
    private Texture2D webViewTexture;

    public int textureWidth = 1024;
    public int textureHeight = 1024;

    void Start()
    {
        // Java WebViewRenderer 초기화
        using (AndroidJavaClass pluginClass = new AndroidJavaClass("com.example.webviewrenderer.WebViewRenderer"))
        {
            webViewRenderer = pluginClass.CallStatic<AndroidJavaObject>("getInstance", GetUnityActivity());
        }

        // WebView 설정 및 URL 로드
        LoadUrl("https://example.com");

        // Texture2D 초기화
        webViewTexture = new Texture2D(textureWidth, textureHeight, TextureFormat.RGBA32, false);
    }

    public void LoadUrl(string url)
    {
        webViewRenderer?.Call("loadUrl", url);
    }

    void Update()
    {
        // Java에서 캡처된 WebView 데이터를 가져와 Texture2D 업데이트
        byte[] imageData = webViewRenderer?.Call<byte[]>("captureWebView");
        if (imageData != null)
        {
            webViewTexture.LoadRawTextureData(imageData);
            webViewTexture.Apply();
        }
    }

    private AndroidJavaObject GetUnityActivity()
    {
        using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
        {
            return unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        }
    }

    void OnGUI()
    {
        // 캡처된 Texture2D를 화면에 그리기
        GUI.DrawTexture(new Rect(0, 0, textureWidth, textureHeight), webViewTexture);
    }
}
