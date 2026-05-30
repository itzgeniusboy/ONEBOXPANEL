import React, { useState } from 'react';
import { Code, Copy, Check, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

export default function IntegrationDocs() {
  const [activeTab, setActiveTab] = useState<'kotlin' | 'java'>('kotlin');
  const [copied, setCopied] = useState(false);

  // Dynamic API host resolver
  const apiEndpoint = window.location.origin + '/api/validate-key';

  const kotlinCode = `package com.onebox.sdk

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class OneBoxLicenseManager(private val context: android.content.Context) {
    private val client = OkHttpClient()
    private val API_URL = "${apiEndpoint}"

    interface LicenseCallback {
        fun onSuccess(sdkType: String, expiresAt: String?)
        fun onFailure(errCode: String, message: String)
    }

    fun checkLicense(licenseKey: String, callback: LicenseCallback) {
        val hwid = getHardwareId()
        val packageName = context.packageName

        val json = JSONObject().apply {
            put("key", licenseKey)
            put("hwid", hwid)
            put("packageName", packageName)
        }

        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(API_URL)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                callback.onFailure("NETWORK_ERROR", e.message ?: "Network unreachable.")
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                val bodyStr = response.body?.string() ?: ""
                if (response.code != 200) {
                    try {
                        val errObj = JSONObject(bodyStr)
                        callback.onFailure(
                            errObj.optString("code", "AUTH_DENIED"), 
                            errObj.optString("message", "License validation failed.")
                        )
                    } catch (e: Exception) {
                        callback.onFailure("SERVER_ERROR", "Response parsing failed: \${response.code}")
                    }
                    return
                }

                try {
                    val root = JSONObject(bodyStr)
                    val license = root.getJSONObject("license")
                    callback.onSuccess(
                        license.getString("sdkType"),
                        license.optString("expiresAt", null)
                    )
                } catch (e: Exception) {
                    callback.onFailure("DECODE_ERROR", "Invalid response contract: \${e.message}")
                }
            }
        })
    }

    private fun getHardwareId(): String {
        return android.provider.Settings.Secure.getString(
            context.contentResolver, 
            android.provider.Settings.Secure.ANDROID_ID
        ) ?: "UNKNOWN_HARDWARE"
    }
}`;

  const javaCode = `package com.onebox.sdk;

import android.content.Context;
import android.provider.Settings;
import okhttp3.*;
import org.json.JSONObject;
import java.io.IOException;

public class OneBoxLicenseManager {
    private final Context context;
    private final OkHttpClient client = new OkHttpClient();
    private final String API_URL = "${apiEndpoint}";

    public interface LicenseCallback {
        void onSuccess(String sdkType, String expiresAt);
        void onFailure(String errCode, String message);
    }

    public OneBoxLicenseManager(Context context) {
        this.context = context;
    }

    public void checkLicense(String licenseKey, final LicenseCallback callback) {
        try {
            String hwid = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            String packageName = context.getPackageName();

            JSONObject json = new JSONObject();
            json.put("key", licenseKey);
            json.put("hwid", hwid != null ? hwid : "UNKNOWN_HARDWARE");
            json.put("packageName", packageName);

            RequestBody body = RequestBody.create(
                json.toString(), 
                MediaType.parse("application/json; charset=utf-8")
            );

            Request request = new Request.Builder()
                .url(API_URL)
                .post(body)
                .build();

            client.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    callback.onFailure("NETWORK_ERROR", e.getMessage());
                }

                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    String bodyStr = response.body() != null ? response.body().string() : "";
                    if (response.code() != 200) {
                        try {
                            JSONObject errObj = new JSONObject(bodyStr);
                            callback.onFailure(
                                errObj.optString("code", "AUTH_DENIED"),
                                errObj.optString("message", "License invalid.")
                            );
                        } catch (Exception e) {
                            callback.onFailure("SERVER_ERROR", "Status: " + response.code());
                        }
                        return;
                    }

                    try {
                        JSONObject root = new JSONObject(bodyStr);
                        JSONObject license = root.getJSONObject("license");
                        callback.onSuccess(
                            license.getString("sdkType"),
                            license.optString("expiresAt", null)
                        );
                    } catch (Exception e) {
                        callback.onFailure("DECODE_ERROR", e.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            callback.onFailure("INIT_ERROR", e.getMessage());
        }
    }
}`;

  const currentCode = activeTab === 'kotlin' ? kotlinCode : javaCode;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm" id="integration_docs_container">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
            <Code className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">SDK Integration</h2>
            <p className="text-xs text-slate-400">Secure validation implementation boilerplate</p>
          </div>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono ${
              activeTab === 'kotlin' ? 'bg-lime-400 text-slate-950 shadow-sm' : 'text-slate-450 hover:text-slate-200 text-slate-400'
            }`}
          >
            Kotlin
          </button>
          <button
            onClick={() => setActiveTab('java')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono ${
              activeTab === 'java' ? 'bg-lime-400 text-slate-950 shadow-sm' : 'text-slate-450 hover:text-slate-200 text-slate-400'
            }`}
          >
            Java
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase font-mono">
            <Terminal className="h-3.5 w-3.5 text-lime-400" />
            {activeTab === 'kotlin' ? 'OneBoxLicenseManager.kt' : 'OneBoxLicenseManager.java'}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-slate-350 border border-slate-850 hover:bg-slate-900 transition-colors cursor-pointer text-slate-300 font-mono"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-450" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                Copy Boilerplate
              </>
            )}
          </button>
        </div>

        <pre className="overflow-x-auto text-slate-300 font-mono text-[10px] leading-5 max-h-96 selection:bg-lime-400/20 selection:text-lime-450 pr-2 bg-slate-950 p-4 border border-slate-800 rounded-lg mt-2.5">
          {currentCode}
        </pre>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-lime-400/10 px-4 py-3 border border-lime-400/20 font-mono">
        <p className="text-xs text-slate-350 font-medium flex items-center gap-1.5 leading-5 text-slate-300">
          <ShieldCheck className="h-4 w-4 text-lime-400 flex-shrink-0" />
          Ensure your OkHttp3 client dependency is compiled in your gradle imports.
        </p>
        <span className="text-[10px] text-lime-400 font-bold hidden md:flex items-center gap-0.5">
          V1.0.0
        </span>
      </div>
    </div>
  );
}
