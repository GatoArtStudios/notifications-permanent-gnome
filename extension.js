/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

export default class NotificationsPermanent extends Extension {
    constructor(metadata) {
        super(metadata);
        this.nty = null;
        this.addnty = null;
    }
    enable() {
        // Almacenamos el metodo original
        this.nty = MessageTray.MessageTray.prototype._updateNotificationTimeout;

        // Sobre escribimos la cantidad de mensajes en cola de una misma fuente de notificaciones
        if (MessageTray.Source.prototype.addNotification) {
            this.addnty = MessageTray.Source.prototype.addNotification;
            MessageTray.Source.prototype.addNotification = function(notification) {
                if (this.notifications.includes(notification))
                    return;
        
                while (this.notifications.length >= 40) {
                    const [oldest] = this.notifications;
                    oldest.destroy(NotificationDestroyedReason.EXPIRED);
                }
        
                notification.connect('destroy', this._onNotificationDestroy.bind(this));
                notification.connect('notify::acknowledged', () => {
                    this.countUpdated();
        
                    // If acknowledged was set to false try to show the notification again
                    if (!notification.acknowledged)
                        this.emit('notification-request-banner', notification);
                });
                this.notifications.push(notification);
        
                this.emit('notification-added', notification);
                this.emit('notification-request-banner', notification);
                this.countUpdated();
            };
        }

        // Sobreescribimos el metodo para evitar el tiempo de espera
        MessageTray.MessageTray.prototype._updateNotificationTimeout = function(timeout) {
            this._notificationTimeoutId = 0; // Deshabilitar el timeout
        };

        Main.notify("Notifications Permanent", "Service Enabled.");
    }

    disable() {
        // Restauramos el metodo original
        if (this.nty) {
            MessageTray.MessageTray.prototype._updateNotificationTimeout = this.nty;
        }
        if (this.addnty) {
            MessageTray.Source.prototype.addNotification = this.addnty;
        }

        Main.notify("Notifications Permanent", "Service Disabled.");
    }
}
