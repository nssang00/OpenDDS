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

        // WebView를 캡처하고 bitmap 데이터 가져오기
        byte[] bitmapBytes = await CaptureWebViewAsync();
        if (bitmapBytes != null)
        {
            // Texture2D에 적용
            ApplyTexture(bitmapBytes);
        }
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

    private Task<byte[]> CaptureWebViewAsync()
    {
        var taskCompletionSource = new TaskCompletionSource<byte[]>();

        // WebView 캡처 및 byte 배열을 반환하는 함수 호출
        webViewHandler.Call("captureWebViewAndGetBitmapBytes", new AndroidJavaObject("com.yourcompany.webviewplugin.WebViewHandler$WebViewCallback", new AndroidJavaRunnable(() =>
        {
            byte[] bitmapBytes = webViewHandler.Call<byte[]>("getBitmapBytes");
            taskCompletionSource.SetResult(bitmapBytes);
        })));

        return taskCompletionSource.Task;
    }

    private void ApplyTexture(byte[] bitmapBytes)
    {
        if (webViewTexture == null)
        {
            // Texture2D 초기화
            webViewTexture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
        }

        // byte 배열을 Texture2D에 적용
        webViewTexture.LoadImage(bitmapBytes);
        webViewTexture.Apply();

        // Unity 오브젝트에 텍스처 적용
        GetComponent<Renderer>().material.mainTexture = webViewTexture;
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
