// WebViewToTexture.cs
using UnityEngine;

public class WebViewToTexture : MonoBehaviour
{
    private AndroidJavaObject webViewRenderer;
    public int textureWidth = 1024; // WebView 너비
    public int textureHeight = 1024; // WebView 높이

    void Start()
    {
        // Java 클래스 초기화
        using (AndroidJavaClass pluginClass = new AndroidJavaClass("com.example.webviewrenderer.WebViewRenderer"))
        {
            webViewRenderer = pluginClass.CallStatic<AndroidJavaObject>("getInstance", GetUnityActivity());
        }

        // WebView URL 로드
        LoadUrl("https://example.com");
    }

    public void LoadUrl(string url)
    {
        if (webViewRenderer != null)
        {
            webViewRenderer.Call("loadUrl", url);
        }
    }

    public Texture2D CaptureWebView()
    {
        if (webViewRenderer == null) return null;

        // Java에서 RAW 데이터를 가져옴
        byte[] rawData = webViewRenderer.Call<byte[]>("captureWebView");

        // Unity Texture2D 생성
        Texture2D texture = new Texture2D(textureWidth, textureHeight, TextureFormat.RGBA32, false);
        texture.LoadRawTextureData(rawData);
        texture.Apply();

        return texture;
    }

    private AndroidJavaObject GetUnityActivity()
    {
        using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
        {
            return unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
        }
    }
}
