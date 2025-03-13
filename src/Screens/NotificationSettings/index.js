import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

const NotificationSettings = () => {
    const navigation = useNavigation();
    const [isAllNotificationsEnabled, setAllNotificationsEnabled] = useState(false);
    const [isChatNotificationsEnabled, setChatNotificationsEnabled] = useState(false);
    const [isGroupChatNotificationsEnabled, setGroupChatNotificationsEnabled] = useState(false);
    const [isGroupInvitationsEnabled, setGroupInvitationsEnabled] = useState(false);
    const [isFriendInvitationsEnabled, setFriendInvitationsEnabled] = useState(false);
    const [expandedSetting, setExpandedSetting] = useState(null);
    const [muteDurations, setMuteDurations] = useState({
        muteChatNotifications: null,
        muteGroupChatNotifications: null,
        muteGroupInvitations: null,
        muteFriendInvitations: null,
    });

    const userId = firebase.auth().currentUser.uid;
    const userRef = firebase
        .app()
        .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
        .ref(`users/${userId}`);
    const serverTime = firebase.database.ServerValue.TIMESTAMP;
    useEffect(() => {
        const handleDataChange = (snapshot) => {
            const userSettings = snapshot.val();
            setAllNotificationsEnabled(userSettings.muteAllNotifications?.mute || false);
            setChatNotificationsEnabled(userSettings.muteChatNotifications?.mute || false);
            setGroupChatNotificationsEnabled(userSettings.muteGroupChatNotifications?.mute || false);
            setGroupInvitationsEnabled(userSettings.muteGroupInvitations?.mute || false);
            setFriendInvitationsEnabled(userSettings.muteFriendInvitations?.mute || false);
    
            // Mute durations and finish times
            setMuteDurations({
                muteAllNotifications: {
                    time: userSettings.muteAllNotifications?.time || null,
                    finishTime: userSettings.muteAllNotifications?.onFinish || null,
                },
                muteChatNotifications: {
                    time: userSettings.muteChatNotifications?.time || null,
                    finishTime: userSettings.muteChatNotifications?.onFinish || null,
                },
                muteGroupChatNotifications: {
                    time: userSettings.muteGroupChatNotifications?.time || null,
                    finishTime: userSettings.muteGroupChatNotifications?.onFinish || null,
                },
                muteGroupInvitations: {
                    time: userSettings.muteGroupInvitations?.time || null,
                    finishTime: userSettings.muteGroupInvitations?.onFinish || null,
                },
                muteFriendInvitations: {
                    time: userSettings.muteFriendInvitations?.time || null,
                    finishTime: userSettings.muteFriendInvitations?.onFinish || null,
                },
            });
        };
    
        userRef.on('value', handleDataChange);
    
        return () => {
            userRef.off('value', handleDataChange); // Cleanup listener on unmount
        };
    }, []);
    
    

    const handleAllNotificationsToggle = (value) => {
        setAllNotificationsEnabled(value);
        userRef.update({ muteAllNotifications: value });
    };

    const handleToggle = (value, setIsEnabled, settingKey) => {
        setIsEnabled(value);
        
        if (!value) {
            // Send a request to cancel the mute on the server
            fetch('https://karga.server.ahmetselimboz.com/cancel-mute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userId,  // Kullanıcı ID'sini buraya ekle
                    settingKey: settingKey,
                }),
            })
            .then(response => response.json())
            .then(data => console.log('Response:', data))
            .catch(error => console.error('Error:', error));
        }
    
        userRef.update({
            [`${settingKey}`]: {
                mute: value,
                onFinish: null,
                time: null,
            },
        });
    };
    

    const handleMuteButtonPress = (settingKey) => {
        const duration = muteDurations[settingKey];
        if (duration) {
            const serverTime = new Date().getTime(); // Example: you should fetch the actual server time from Firebase
           const onFinish = serverTime + duration * 60 * 60 * 1000; // Convert hours to milliseconds
           //const onFinish = serverTime + 10 * 1000; // Convert hours to milliseconds
    
            userRef.update({
                [`${settingKey}`]: {
                    onFinish: onFinish,
                    mute: true,
                    time: duration,
                },
            });
    
            // Node.js sunucusuna POST isteği gönder
        fetch('https://karga.server.ahmetselimboz.com/set-mute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,  // Kullanıcı ID'sini buraya ekle
                settingKey: settingKey,
                onFinish: onFinish,
            }),
        })
        .then(response => response.json())
        .then(data => console.log('Response:', data))
        .catch(error => console.error('Error:', error));

        setMuteDurations((prev) => ({ ...prev, [settingKey]: null }));
    }
    };
    const handleDurationSelect = (duration, settingKey) => {
        setMuteDurations((prev) => ({ ...prev, [settingKey]: duration }));
    };
    const renderDurationOptions = (settingKey) => (
        <View style={styles.durationOptionsContainer}>
            <Text style={styles.durationOptionsText}>Select Duration:</Text>
            <View style={styles.durationButtons}>
                {[1, 5, 10, 24].map((duration) => (
                    <TouchableOpacity
                        key={duration}
                        onPress={() => handleDurationSelect(duration, settingKey)}
                        style={[
                            styles.durationButton,
                            muteDurations[settingKey] === duration && styles.selectedDurationButton,
                        ]}
                    >
                        <Text
                            style={[
                                styles.durationButtonText,
                                muteDurations[settingKey] === duration && styles.selectedDurationButtonText,
                            ]}
                        >
                            {duration} Hour{duration > 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity onPress={() => handleMuteButtonPress(settingKey)}>
                <View style={styles.muteButton}>
                    <Text style={styles.muteButtonText}>Mute</Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    const renderSettingOption = (title, isEnabled, setIsEnabled, description, settingKey, isDisabled = false) => {
        const muteInfo = muteDurations[settingKey] || {};
        const finishTime = muteInfo.finishTime 
            ? new Date(muteInfo.finishTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) 
            : '';
        const time = muteInfo.time;
    
        return (
            <View>
                <TouchableOpacity
                    style={styles.settingContainer}
                    onPress={() => setExpandedSetting(expandedSetting === settingKey ? null : settingKey)}
                    disabled={isDisabled}
                >
                    <Text style={[styles.settingText, isDisabled && { color: '#aaa' }]}>{title}</Text>
                    <Switch
                        value={isEnabled}
                        onValueChange={(value) => handleToggle(value, setIsEnabled, settingKey)}
                        trackColor={{ false: isDisabled ? '#ddd' : '#ddd', true: '#FF8400' }}
                        thumbColor={isDisabled ? '#f4f3f4' : isEnabled ? '#FF8400' : '#f4f3f4'}
                        disabled={isDisabled}
                    />
                </TouchableOpacity>
    
                {isEnabled && time && finishTime && (
    <Text style={styles.muteInfoText}>
        <Text style={{ fontWeight: 'bold' }}>{time}-hour</Text> mute applied. Ends at: <Text style={{ fontWeight: 'bold' }}>{finishTime}</Text>
    </Text>
)}
{isEnabled && !time && !finishTime && (
    <Text style={styles.muteInfoText}>
        Mute is applied <Text style={{ fontWeight: 'bold' }}>permanently.</Text>
    </Text>
)}

    
                {expandedSetting === settingKey && !isDisabled && (
                    <View>
                        <Text style={styles.description}>{description}</Text>
                        {!isEnabled && renderDurationOptions(settingKey)}
                    </View>
                )}
            </View>
        );
    };
    
    
    

    return (
        <LinearGradient
            style={styles.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0 }}
            colors={['#FF8400', '#FFA500']}
        >
            <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                    <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                </View>
            </View>
            <View style={styles.container}>
                <Text style={styles.title}>Notification Settings</Text>
                <View style={styles.settings}>
                    <View style={styles.box}>
                        <Text style={styles.boxTitle}>All Notifications</Text>
                        {renderSettingOption(
                            'Mute All Notifications',
                            isAllNotificationsEnabled,
                            handleAllNotificationsToggle,
                            'This option mutes all notifications. When activated, the other options are not checked and all notifications are muted',
                            'muteAllNotifications'
                        )}
                    </View>
                    <View style={styles.box}>
                        <Text style={styles.boxTitle}>Chat Notifications</Text>
                        {renderSettingOption(
                            'Mute Friends Chat Notifications',
                            isChatNotificationsEnabled,
                            setChatNotificationsEnabled,
                            'This option mutes all friends chat notifications.',
                            'muteChatNotifications',
                            isAllNotificationsEnabled // Disable if all notifications are muted
                        )}
                        {renderSettingOption(
                            'Mute Group Chat Notifications',
                            isGroupChatNotificationsEnabled,
                            setGroupChatNotificationsEnabled,
                            'This option mutes all group chat notifications.',
                            'muteGroupChatNotifications',
                            isAllNotificationsEnabled // Disable if all notifications are muted
                        )}
                    </View>
                    <View style={styles.box}>
                        <Text style={styles.boxTitle}>Invitation Notifications</Text>
                        {renderSettingOption(
                            'Mute Group Invitations',
                            isGroupInvitationsEnabled,
                            setGroupInvitationsEnabled,
                            'This option mutes all group invitation notifications.',
                            'muteGroupInvitations',
                            isAllNotificationsEnabled // Disable if all notifications are muted
                        )}
                        {renderSettingOption(
                            'Mute Friend Invitations',
                            isFriendInvitationsEnabled,
                            setFriendInvitationsEnabled,
                            'This option mutes all friend invitation notifications.',
                            'muteFriendInvitations',
                            isAllNotificationsEnabled // Disable if all notifications are muted
                        )}
                    </View>
                </View>
            </View>
        </LinearGradient>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    muteInfoText: {
        marginTop: 5,
    },
    background: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        paddingTop: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#4B4B4B',
        alignSelf: 'flex-start',
        marginLeft: 20,
        marginBottom: 20,
    },
    settings: {
        marginTop: 20,
        width: '100%',
        paddingHorizontal: 20,
    },
    box: {
        marginBottom: 20,
        borderRadius: 10,
        backgroundColor: '#f9f9f9',
        padding: 15,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 5 },
        shadowRadius: 10,
        elevation: 3,
    },
    boxTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4B4B4B',
        marginBottom: 10,
    },
    settingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    settingText: {
        fontSize: 18,
        color: '#4B4B4B',
    },
    description: {
        marginTop: 5,
        fontSize: 14,
        color: '#666',
        alignSelf: 'flex-start',
        paddingBottom: 10,
    },
    durationOptionsContainer: {
        marginTop: 10,
    },
    durationOptionsText: {
        fontSize: 16,
        color: '#4B4B4B',
        marginBottom: 10,
    },
    durationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 5,
    },
    durationButton: {
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FF8400',
        backgroundColor: 'white', // Default background color for unselected buttons
    },
    selectedDurationButton: {
        backgroundColor: '#FF8400', // Background color for selected button
    },
    durationButtonText: {
        color: '#FF8400',
        fontWeight: 'bold',
    },
    selectedDurationButtonText: {
        color: 'white', // Text color for selected button
    },
    muteButton: {
        backgroundColor: '#FF8400',
        borderRadius: 20,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    muteButtonText: {
        color: 'white',
    },
});

export default NotificationSettings;
