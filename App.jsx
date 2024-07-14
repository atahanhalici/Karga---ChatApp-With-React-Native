import React from "react";
import Route from './src/Route';
import PushNotification from "react-native-push-notification";
import { firebase } from "@react-native-firebase/app";
import messaging from '@react-native-firebase/messaging';

class App extends React.Component {
    componentDidMount() {
        // Firebase Messaging üzerinden bildirim ayarları
        firebase.messaging().registerDeviceForRemoteMessages()
            .then((res) => console.log("Device registered:", res))
            .catch((e) => console.log("Error registering device:", e));

        firebase.messaging().hasPermission()
            .then((enabled) => {
                if (enabled) {
                    firebase.messaging().getToken()
                        .then(token => console.log("Token:", token));
                } else {
                    console.log("Permission not granted for notifications");
                }
            });

        firebase.messaging().onMessage(async remoteMessage => {
            console.log("Message received:", remoteMessage);

            // PushNotification ile lokal bildirim gönderme
            PushNotification.localNotification({
                channelId: "id", // Kanal ID'si
                title: remoteMessage.notification.title,
                message: remoteMessage.notification.body,
                soundName: "noti.mp3",
            });
        });

        // Bildirim kanalı oluşturma işlemi (opsiyonel)
        PushNotification.createChannel(
            {
                channelId: "id", // Kanal ID'si
                channelName: "My Channel", // Kanal adı
                channelDescription: "A channel to categorize your notifications", // Kanal açıklaması (opsiyonel)
                soundName: "noti.mp3", // Bildirim sesi (opsiyonel)
                importance: 4, // Önem seviyesi: 0 - 4 arası (4 en yüksek)
                vibrate: true, // Titreşim (opsiyonel)
            },
            (created) => console.log(`Channel '${created}' created`) // Kanal oluşturulduğunda geri çağrı
        );

        // PushNotification ayarları
        PushNotification.configure({
            onRegister: function (token) {
                console.log("TOKEN:", token);
            },
            onNotification: function (notification) {
                console.log("NOTIFICATION:", notification);
                //notification.finish(PushNotificationIOS.FetchResult.NoData); // Hermes için gerekli değil
            },
            onAction: function (notification) {
                console.log("ACTION:", notification.action);
                console.log("NOTIFICATION:", notification);
            },
            popInitialNotification: true,
            requestPermissions: true,
            senderId: "967608849678", // Android için gerekli olabilir
        });

        // Arka plan mesaj işleyicisi
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('Message handled in the background!', remoteMessage);

            // PushNotification ile lokal bildirim gönderme
            PushNotification.localNotification({
                channelId: "id",
                title: remoteMessage.notification.title,
                message: remoteMessage.notification.body,
                soundName: "noti.mp3",
            });
        });
    }

    render() { 
        return <Route />;
    }
}

export default App;
