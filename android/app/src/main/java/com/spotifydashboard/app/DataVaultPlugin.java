package com.spotifydashboard.app;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges the native data vault to the web layer: reports where the copy
 * lives, forces a save and opens the system screen that grants "All files
 * access" so the copy can live in the real Documents folder.
 */
@CapacitorPlugin(name = "DataVault")
public class DataVaultPlugin extends Plugin {

    @PluginMethod
    public void status(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("folder", DataVault.displayPath(getContext()));
        ret.put("fallbackFolder", DataVault.fallbackPath(getContext()));
        ret.put("usingDocuments", DataVault.hasDocumentsAccess(getContext()));
        ret.put("needsPermission", DataVault.needsPermission(getContext()));
        ret.put("lastSaved", DataVault.lastSaved(getContext()));
        ret.put("fileCount", DataVault.fileCount(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void save(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ok", DataVault.backup(getContext()));
        ret.put("lastSaved", DataVault.lastSaved(getContext()));
        ret.put("fileCount", DataVault.fileCount(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        Intent intent = DataVault.accessIntent(getContext());
        if (intent == null) {
            // Android 10 and older: WRITE_EXTERNAL_STORAGE is a normal
            // runtime permission, the app asks for it from the web layer.
            call.resolve();
            return;
        }
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the storage settings", e);
        }
    }
}
