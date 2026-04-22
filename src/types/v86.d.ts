interface V86Config {
  wasm_path?: string;
  memory_size?: number;
  vga_memory_size?: number;
  screen_container?: HTMLElement | null;
  bios?: { url: string } | { buffer: ArrayBuffer };
  vga_bios?: { url: string } | { buffer: ArrayBuffer };
  bzimage?: { url: string } | { buffer: ArrayBuffer };
  cdrom?: { url: string } | { buffer: ArrayBuffer };
  hda?: { url: string } | { buffer: ArrayBuffer };
  autostart?: boolean;
  bzimage_initrd_from_filesystem?: boolean;
  cmdline?: string;
  filesystem?: { baseurl: string; basefs: string };
  network_relay_url?: string;
  acpi?: boolean;
  initial_state?: { url: string } | { buffer: ArrayBuffer };
}

declare class V86Starter {
  constructor(config: V86Config);
  serial0_send(data: string): void;
  add_listener(event: string, cb: (...args: any[]) => void): void;
  remove_listener(event: string, cb: (...args: any[]) => void): void;
  destroy(): void;
  restart(): void;
  is_running(): boolean;
  save_state(callback: (err: Error | null, state: ArrayBuffer) => void): void;
  restore_initial_state(): void;
}

interface Window {
  V86Starter: typeof V86Starter;
}
