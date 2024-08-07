import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, Dimensions, View, Vibration, Image, Modal } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';

const Message = ({ item, index, otherUser, isConversation, read, isGroup, openModall, star }) => {
    const user = auth().currentUser;
    const userId = user.uid;
    const [lastVibrated, setLastVibrated] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [messageText, setMessageText] = useState(item.text);

    useEffect(() => {
        if (item.messageType === "vibration") {
            handleVibrationMessage();
        }
    }, []);

    const getUserName = async (userId) => {
        try {
            if (!userId) {
                throw new Error("Invalid user ID");
            }

            const userSnapshot = await firebase
                .app()
                .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`users/${userId}`)
                .once('value');

            const userData = userSnapshot.val();
            if (!userData) {
                throw new Error(`No data found for user ID: ${userId}`);
            }

            return userData.userName || "";
        } catch (error) {
            console.error("Error fetching user data:", error);
            return "";
        }
    };

    const handleImagePress = () => {
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
    };

    const handleVibrationMessage = async () => {
        if (isConversation) {
            if (item.userId !== userId) {
                setMessageText(`${await getUserName(item.userId)} sizi titretti`);
                vibrateIfNeeded(item.timestamp);
            } else {
                setMessageText(`${otherUser} kullanıcısını titrettiniz`);
            }
        } else if (isGroup) {
            const isCurrentUserInSelectedUsers = item.selectedUsers.includes(userId);

            if (isCurrentUserInSelectedUsers) {
                if (item.selectedUsers.length === 1) {
                    setMessageText(`${await getUserName(item.userId)} sizi titretti`);
                } else if (item.selectedUsers.length === 2) {
                    const otherUserId = item.selectedUsers.find(id => id !== userId);
                    const otherUserName = await getUserName(otherUserId);
                    setMessageText(`${await getUserName(item.userId)}, sizi ve ${otherUserName} adlı kullanıcıyı titretti`);
                } else {
                    setMessageText(`${await getUserName(item.userId)} ve diğer kullanıcıları titretti`);
                }
                vibrateIfNeeded(item.timestamp);
            } else {
                if (item.selectedUsers.length < 2) {
                    const selectedUserNames = await Promise.all(
                        item.selectedUsers.map(id => getUserName(id))
                    );
                    setMessageText(`${await getUserName(item.userId)}, ${selectedUserNames.join(", ")} kullanıcısını titretti`);
                } else {
                    setMessageText(`${await getUserName(item.userId)}, birden fazla kişiyi titretti`);
                }
            }
        }
    };

    const vibrateIfNeeded = (timestamp) => {
        const messageDate = new Date(timestamp);
        const now = Date.now();
        const timeSinceMessage = now - messageDate;

        if (timeSinceMessage < 2000 && (!lastVibrated || messageDate > lastVibrated)) {
            Vibration.vibrate(1000);
            setLastVibrated(messageDate);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <View style={userId !== item.userId ? style.other : style.me}>
            <View
                style={[
                    style.bubble,
                    {
                        borderTopRightRadius: userId === item.userId ? 0 : 15,
                        borderTopLeftRadius: userId === item.userId ? 15 : 0,
                        backgroundColor: userId === item.userId ? '#FF8400' : '#ddd',
                    },
                ]}
            >
                {item.messageType === "image" ? (
                    <TouchableOpacity
                        onPress={handleImagePress}
                        activeOpacity={1}
                        onLongPress={() => {
                            if (item.userId === userId && isGroup) {
                                openModall(item.id);
                            }
                        }}
                    >
                        <Image
                            source={{ uri: item.text }}
                            style={{ width: 200, height: 200, marginBottom: 10 }} // Adjust width and height as needed
                        />
                    </TouchableOpacity>
                ) : (
                    <Text style={{ color: userId === item.userId ? 'white' : '#575757', fontSize: 15, marginBottom: 8 }}>
                        {messageText}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text
                        style={{
                            color: userId === item.userId ? 'white' : '#575757',
                            textAlign: userId === item.userId ? 'right' : 'left',
                            fontSize: 11,
                        }}
                    >
                        {item.userName}
                    </Text>
                    <View style={{ flex: 1 }}></View>
                    <Text
                        style={{
                            color: userId === item.userId ? 'white' : '#575757',
                            textAlign: userId === item.userId ? 'right' : 'left',
                            fontSize: 11,
                            paddingLeft: 10,
                        }}
                    >
                        {formatTime(item.timestamp)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 5 }}>
                        {star && <Icon name="star" size={14} color="grey" style={{ marginRight: 5 }} />}
                        {(isConversation || isGroup) && userId === item.userId && (
                            <Icon name="check" size={14} style={{ color: read ? '#0f73ae' : 'black', marginLeft: 5 }} />
                        )}
                    </View>
                </View>

                <Modal visible={modalVisible} transparent={true} onRequestClose={closeModal}>
                    <View style={style.modalBackground}>
                        <TouchableOpacity style={style.modalContainer} onPress={closeModal}>
                            <Image source={{ uri: item.text }} style={style.fullscreenImage} resizeMode="contain" />
                        </TouchableOpacity>
                    </View>
                </Modal>
            </View>
        </View>
    );
};

const style = StyleSheet.create({
    other: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-start',
    },
    me: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-end',
    },
    bubble: {
        padding: 10,
        backgroundColor: '#ddd',
        maxWidth: Dimensions.get('window').width * 0.7,
        marginBottom: 10,
        borderRadius: 15,
        margin: 10,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '80%',
        height: 'auto',
        aspectRatio: 1, // Ensures the aspect ratio is maintained
    },
});

export default Message;
