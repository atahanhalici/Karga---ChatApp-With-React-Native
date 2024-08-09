import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';

const NotificationSettings = () => {
    const navigation = useNavigation();
    const [isAllNotificationsEnabled, setAllNotificationsEnabled] = useState(false);
    const [isChatNotificationsEnabled, setChatNotificationsEnabled] = useState(false);
    const [isGroupChatNotificationsEnabled, setGroupChatNotificationsEnabled] = useState(false);
    const [isGroupInvitationsEnabled, setGroupInvitationsEnabled] = useState(false);
    const [isFriendInvitationsEnabled, setFriendInvitationsEnabled] = useState(false);
    const [expandedSetting, setExpandedSetting] = useState(null);
    
    const userId = firebase.auth().currentUser.uid;
    const userRef = firebase
        .app()
        .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
        .ref(`users/${userId}`);

    useEffect(() => {
        // Fetch notification settings from the database when the component mounts
        userRef.once('value').then(snapshot => {
            const userSettings = snapshot.val();
            setAllNotificationsEnabled(userSettings.muteAllNotifications || false);
            setChatNotificationsEnabled(userSettings.muteChatNotifications || false);
            setGroupChatNotificationsEnabled(userSettings.muteGroupChatNotifications || false);
            setGroupInvitationsEnabled(userSettings.muteGroupInvitations || false);
            setFriendInvitationsEnabled(userSettings.muteFriendInvitations || false);
        });
    }, []);

    const handleAllNotificationsToggle = (value) => {
        setAllNotificationsEnabled(value);
        
        userRef.update({
            muteAllNotifications: value,
        });
    };

    const handleToggle = (value, setIsEnabled, settingKey) => {
        setIsEnabled(value);
        userRef.update({
            [settingKey]: value,
        });
    };

    const renderSettingOption = (title, isEnabled, setIsEnabled, description, settingKey, isDisabled = false) => (
        <View>
            <TouchableOpacity
                style={styles.settingContainer}
                onPress={() => setExpandedSetting(expandedSetting === settingKey ? null : settingKey)}
                disabled={isDisabled} // Disable the whole row if isDisabled is true
            >
                <Text style={[styles.settingText, isDisabled && { color: '#aaa' }]}>{title}</Text>
                <Switch
                    value={isEnabled}
                    onValueChange={(value) => handleToggle(value, setIsEnabled, settingKey)}
                    trackColor={{ false: isDisabled ? '#ddd' : '#ddd', true: '#FF8400' }}
                    thumbColor={isDisabled ? '#f4f3f4' : (isEnabled ? '#FF8400' : '#f4f3f4')}
                    disabled={isDisabled} // Disable the switch if isDisabled is true
                />
            </TouchableOpacity>
            {expandedSetting === settingKey && !isDisabled && (
                <Text style={styles.description}>{description}</Text>
            )}
        </View>
    );
    
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
                            'This option mutes all notifications.',
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
                            'muteChatNotifications'
                        )}
                        {renderSettingOption(
                            'Mute Group Chat Notifications',
                            isGroupChatNotificationsEnabled,
                            setGroupChatNotificationsEnabled,
                            'This option mutes all group chat notifications.',
                            'muteGroupChatNotifications'
                        )}
                    </View>
                    <View style={styles.box}>
                        <Text style={styles.boxTitle}>Invitation Notifications</Text>
                        {renderSettingOption(
                            'Mute Group Invitations',
                            isGroupInvitationsEnabled,
                            setGroupInvitationsEnabled,
                            'This option mutes all group invitation notifications.',
                            'muteGroupInvitations'
                        )}
                        {renderSettingOption(
                            'Mute Friend Invitations',
                            isFriendInvitationsEnabled,
                            setFriendInvitationsEnabled,
                            'This option mutes all friend invitation notifications.',
                            'muteFriendInvitations'
                        )}
                    </View>
                </View>
            </View>
        </LinearGradient>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
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
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: 10,
    },
});

export default NotificationSettings;
