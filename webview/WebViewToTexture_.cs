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
