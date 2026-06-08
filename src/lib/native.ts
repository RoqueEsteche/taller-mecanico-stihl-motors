/**
 * Wrapper de servicios nativos Capacitor con fallback para web.
 * Importar este módulo desde cualquier componente que necesite acceso
 * a funciones de dispositivo (cámara, háptica, notificaciones).
 */

const isNative = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    (window as any).Capacitor?.isNativePlatform?.());

// ── Háptica ──────────────────────────────────────────────────────────────────
export async function hapticSuccess() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch { /* ignorar si no disponible */ }
}

export async function hapticError() {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch { /* ignorar */ }
}

export async function hapticLight() {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignorar */ }
}

// ── Cámara ────────────────────────────────────────────────────────────────────
/** Devuelve un dataURL base64 de la foto tomada, o null si se canceló. */
export async function takePhoto(): Promise<string | null> {
  if (!isNative()) {
    // Fallback web: input[type=file]
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Abre la galería del dispositivo y retorna el dataURL de la imagen elegida. */
export async function pickFromGallery(): Promise<string | null> {
  if (!isNative()) return takePhoto();
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

// ── Notificaciones locales ────────────────────────────────────────────────────
/** Solicita permiso y programa una notificación local. */
export async function scheduleLocalNotification(opts: {
  title: string;
  body: string;
  id?: number;
  scheduleAt?: Date;
}) {
  if (!isNative()) {
    if ('Notification' in window) {
      await Notification.requestPermission();
      if (Notification.permission === 'granted') {
        new Notification(opts.title, { body: opts.body });
      }
    }
    return;
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.schedule({
      notifications: [{
        title: opts.title,
        body: opts.body,
        id: opts.id ?? Date.now(),
        schedule: opts.scheduleAt ? { at: opts.scheduleAt } : undefined,
        sound: undefined,
        actionTypeId: '',
        extra: null,
      }],
    });
  } catch { /* ignorar */ }
}

/** Notifica al mecánico que tiene una OT nueva asignada. */
export async function notifyNewAssignment(orderNumber: number, clientName: string) {
  await scheduleLocalNotification({
    title: '🔧 Nueva orden asignada',
    body: `OT #${String(orderNumber).padStart(5, '0')} — ${clientName}`,
    id: orderNumber,
  });
}
