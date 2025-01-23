using System.Threading.Tasks;
using UnityEngine;

public class WebViewTexture : MonoBehaviour
{
    private AndroidJavaObject webViewHandler;
    private Texture2D webViewTexture;

    async void Start()
    {
        // WebView 초기화
        InitializeWebView();

        // WebView에 URL 로드
        await LoadWebViewAsync("https://example.com");

        // 실시간으로 WebView 캡처 데이터를 반영
        StartReceivingWebViewFrames();
    }

    private void InitializeWebView()
    {
        using (var unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
        {
            var activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
            var webView = new AndroidJavaObject("android.webkit.WebView", activity);
            webViewHandler = new AndroidJavaObject("com.yourcompany.webviewplugin.WebViewHandler", activity, webView);
        }
    }

    private Task LoadWebViewAsync(string url)
    {
        return Task.Run(() => webViewHandler.Call("loadUrl", url));
    }

    private void StartReceivingWebViewFrames()
    {
        // 주기적으로 WebView 데이터를 가져오는 루프
        InvokeRepeating(nameof(UpdateWebViewTexture), 0, 0.033f); // 30fps
    }

    private void UpdateWebViewTexture()
    {
        webViewHandler.Call("captureWebViewAndGetRawBitmapData", new AndroidJavaProxy("com.yourcompany.webviewplugin.WebViewHandler$WebViewCallback")
        {
            onComplete = new AndroidJavaRunnableProxy((rawBitmapData, width, height) =>
            {
                // Texture2D 초기화
                if (webViewTexture == null || webViewTexture.width != width || webViewTexture.height != height)
                {
                    webViewTexture = new Texture2D(width, height, TextureFormat.RGBA32, false);
                    GetComponent<Renderer>().material.mainTexture = webViewTexture;
                }

                // RAW 데이터를 Texture2D에 반영
                webViewTexture.LoadRawTextureData(rawBitmapData);
                webViewTexture.Apply();
            })
        });
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
