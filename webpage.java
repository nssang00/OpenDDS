    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" android:minSdkVersion="33"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" android:minSdkVersion="33"/>
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" android:minSdkVersion="33"/>
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" android:minSdkVersion="33"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>


package com.example.myapplication;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Environment;
import androidx.core.app.ActivityCompat;
import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {
    private TextView textView;
    private WebView webView;
    private static int WRITE_PERMISSION = 1;
    private static int READ_PERMISSION = 2;

    private final int MULTIPLE_PERMISSIONS = 1023;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        textView = (TextView) findViewById(R.id.textView);

        checkPermission();

        write();
        read();

        webView = findViewById(R.id.webView);

        // WebView 설정을 가져옵니다.
        WebView.setWebContentsDebuggingEnabled(true);
        WebSettings webSettings = webView.getSettings();

        // JavaScript를 활성화합니다. (필요에 따라 설정)
        webSettings.setJavaScriptEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webView.loadUrl("https://www.google.co.kr");
    }

    public void write() {
        try {
            File file = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {//android 10(SDK 29)
                file = new File(this.getExternalFilesDir(null), "test.txt");
                //file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "test.txt");
                Log.d("Webview", "Write android 10 > 111 " + file.getPath());
                FileWriter fileWriter = new FileWriter(file);

                BufferedWriter out = new BufferedWriter(fileWriter);
                out.write("Write text to External Storage.dddd");
                out.close();
            } else {//android 9 이하
                file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "test.txt");
            }

            FileWriter fileWriter = new FileWriter(file);

            BufferedWriter out = new BufferedWriter(fileWriter);
            out.write("Write text to External Storage.ddddd");
            out.close();            
            Log.d("Webview", "Write text to External Storage.");
            textView.setText("Write text to External Storage.");  

        } catch (IOException e) {
            Log.d("Webview", e.getMessage());
            textView.setText("Cannot write text to External Storage!");
        }catch (Exception e) {
            Toast.makeText(getBaseContext(), "Cannot write text to External Storage!", Toast.LENGTH_SHORT).show();
        }
    }


    public void read() {
        try {
            File root = this.getExternalFilesDir(null);
            //File root = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);

            File file = new File(this.getExternalFilesDir(null), "test.txt");
            Log.d("Webview", "read2 " + file.getPath());
            FileReader fileReader = new FileReader(file);
            BufferedReader in = new BufferedReader(fileReader);
            String sLine = in.readLine();
            textView.setText(sLine);
        } catch (IOException e) {
            Log.d("Webview", e.getMessage());
            textView.setText("Cannot read text from External Storage!");
        } catch (Exception e) {
            Toast.makeText(getBaseContext(), "Cannot read text from External Storage!", Toast.LENGTH_SHORT).show();
        }
    }

    public boolean checkPermission()
    {
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {//SDK 23

            String[] permissions = null;
            if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {//android 13(SDK 33)
                permissions = new String[]{
                        Manifest.permission.READ_MEDIA_IMAGES,
                        Manifest.permission.READ_MEDIA_VIDEO,
                        Manifest.permission.READ_MEDIA_AUDIO,
                        Manifest.permission.POST_NOTIFICATIONS};
            } else {
                permissions = new String[]{
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE};
            }

            List<String> denied_permissions = new ArrayList<String>();
            for (String perm : permissions) {
                if (ActivityCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED)
                    denied_permissions.add(perm);
            }

            if(denied_permissions.size() > 0){
                String [] deniedPerms = denied_permissions.toArray(new String[denied_permissions.size()]);
                ActivityCompat.requestPermissions(this, deniedPerms, MULTIPLE_PERMISSIONS);
                return false;
            }
        }
        return true;
    }
/*
    public boolean isWriteStoragePermissionGranted() {
        if (Build.VERSION.SDK_INT >= 23) {

            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                return true;
            } else {
                Log.d("Webview", "Write permission is not granted! else");
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, WRITE_PERMISSION);
                return false;
            }
        } else {
            return true;
        }
    }

    public boolean isReadStoragePermissionGranted() {
        if (Build.VERSION.SDK_INT >= 23) {
            if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED) {
                return true;
            } else {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, READ_PERMISSION);
                return false;
            }
        } else {
            return true;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        Log.d("Webview", "onRequestPermissionsResult111 " + String.valueOf(requestCode));
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == READ_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("Webview", "권한 부여");
                write();
                Log.d("Webview", "권한 부여2");
            } else {
                Log.d("Webview", "권한 거절");
            }
        }
    }
*/

}
