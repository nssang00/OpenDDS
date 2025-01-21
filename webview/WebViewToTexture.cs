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
