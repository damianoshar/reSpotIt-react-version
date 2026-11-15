package com.spotifydashboard.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.database.sqlite.CapacitorSQLitePlugin;
import com.spotifydashboard.librespot.LibrespotPlayerPlugin;
import io.capawesome.capacitorjs.plugins.filepicker.FilePickerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Restore the public data vault before the WebView loads, so a fresh
        // install comes up with its sign-in, settings and library.
        DataVault.restoreIfEmpty(this);
        registerPlugin(CapacitorSQLitePlugin.class);
        registerPlugin(FilePickerPlugin.class);
        registerPlugin(AddFromSitePlugin.class);
        registerPlugin(PlaybackTuningPlugin.class);
        registerPlugin(LibrespotPlayerPlugin.class);
        registerPlugin(DataVaultPlugin.class);
        super.onCreate(savedInstanceState);
        handleSharedIntent(getIntent());
    }

    @Override
    public void onStop() {
        super.onStop();
        // Leaving the app is the cheapest safe moment to snapshot everything.
        // The short delay gives the web layer time to flush its localStorage
        // into Preferences before the copy is taken.
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            DataVault.backup(getApplicationContext());
        }, 1200);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSharedIntent(intent);
    }

    private void handleSharedIntent(Intent intent) {
        if (intent == null) return;
        String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (shared == null || shared.trim().isEmpty()) return;
        // Defer until the bridge (and plugins) are ready.
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            try {
                AddFromSitePlugin plugin = (AddFromSitePlugin) getBridge().getPlugin("AddFromSite").getInstance();
                if (plugin != null) plugin.openFromShare(shared.trim());
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "share handling failed", e);
            }
        }, 500);
    }
}
