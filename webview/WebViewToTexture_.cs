using UnityEngine;
  using System.Collections;

  public class WebViewSurfaceTexture : MonoBehaviour
  {
      private Texture2D texture;
      private AndroidJavaObject webViewRenderer;

      void Start()
      {
          // Texture2D 생성
          texture = new Texture2D(1024, 1024, TextureFormat.ARGB32, false);

          // 네이티브 텍스처 ID 가져오기
          int textureId = (int)texture.GetNativeTexturePtr();

          // 안드로이드 플러그인 초기화
          AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
          AndroidJavaObject activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
          webViewRenderer = new AndroidJavaObject("com.example.WebViewRenderer");

          // WebView 및 SurfaceTexture 설정
          webViewRenderer.Call("setupWebView", activity, textureId);

          // 텍스처를 머티리얼에 적용
          GetComponent<Renderer>().material.mainTexture = texture;
      }

      void Update()
      {
          // 매 프레임마다 SurfaceTexture 업데이트
          webViewRenderer.Call("updateTexture");
      }
  }
/////////
using System;
using UnityEngine;

public class WebViewToTexture : MonoBehaviour
{
    private AndroidJavaObject webViewToTexture;
    private Texture2D webViewTexture;

    public int textureWidth = 1024;
    public int textureHeight = 1024;

    private void Start()
    {
        // Get current Unity activity
        AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
        AndroidJavaObject currentActivity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");

        // Create Texture2D and get its native texture ID
        webViewTexture = new Texture2D(textureWidth, textureHeight, TextureFormat.RGBA32, false);
        int textureId = webViewTexture.GetNativeTexturePtr().ToInt32();

        // Initialize WebViewToTexture Java object
        webViewToTexture = new AndroidJavaObject(
            "com.example.webviewtotexture.WebViewToTexture",
            textureWidth, textureHeight, textureId
        );

        // Apply the texture to the GameObject's material
        Renderer renderer = GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.material.mainTexture = webViewTexture;
        }
    }

    public void LoadUrl(string url)
    {
        if (webViewToTexture != null)
        {
            webViewToTexture.Call("loadUrl", url);
        }
    }

    private void OnDestroy()
    {
        if (webViewToTexture != null)
        {
            webViewToTexture.Call("release");
        }
    }
}
