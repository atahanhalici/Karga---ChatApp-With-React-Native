import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView } from 'react-native';
import Message from '../../Components/Rooms/Message';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';



class Chat extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            text: '',
            connectedUserCount: 0
        };
    }

    // Kullanıcı bağlantı durumu düşürme işlevi
 decreaseConnectedUserCount = (roomId) => {

    // Firebase referansı oluşturun
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);

    // Kullanıcı bağlantısı kesildiğinde bu işlemi yap
    roomRef.onDisconnect().update({
        connectedUserCount: firebase.database.ServerValue.increment(-1)
    });
};

decreaseConversationUserStatus = (conversationId) => {
    const userId = firebase.auth().currentUser.uid;
    const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
    
    conversationRef.onDisconnect().update({
        inChat: false,
        lastLeft: firebase.database.ServerValue.TIMESTAMP
    });
};

cancelDisconnect = (roomId) => {
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);
        
            roomRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
        
    };

    cancelDisconnectConversation = (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
            
                conversationRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
            
        };

    renderItem = ({ item, index }) => {
        return <Message item={item} index={index}></Message>;
    };

    componentDidMount() {
        const { roomId, conversationId, name } = this.props.route.params;
        this.props.navigation.setOptions({
            title: name,
        });

        if (roomId) {
            this.joinRoom(roomId);

            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`messages/${roomId}`)
            .orderByChild('timestamp') // timestamp alanına göre sıralama
            .on('value', snapshot => {
                var messages = [];
                snapshot.forEach((item) => {
                    messages.push({
                        roomId: item.val().roomId,
                        text: item.val().text,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key,
                        
                    });
                });
                // Tarihe göre sıralama
                messages.sort((a, b) => b.timestamp - a.timestamp);
                
                this.setState({ messages });
            });

            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`rooms/${roomId}/connectedUserCount`)
                .on('value', snapshot => {
                    this.setState({ connectedUserCount: snapshot.val() || 0 });
                });

            // Kullanıcı bağlantısı kesildiğinde bağlı kullanıcı sayısını azalt
            this.decreaseConnectedUserCount(roomId);
        } else if (conversationId) {
            this.fetchConversationMessages(conversationId);
            this.handleJoinChat(conversationId);
            this.decreaseConversationUserStatus(conversationId);
            this.markMessagesAsRead(conversationId);
        }
    }

    markMessagesAsRead = (conversationId) => {
        const userId = auth().currentUser.uid;
        const messagesRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/messages`);
    
        messagesRef.once('value', snapshot => {
            snapshot.forEach((childSnapshot) => {
                if (childSnapshot.val().userId !== userId && !childSnapshot.val().read) {
                    childSnapshot.ref.update({ read: true });
                }
            });
        });
    };
     handleLeaveChat = async (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
        
        await conversationRef.update({
            inChat: false,
            lastLeft: firebase.database.ServerValue.TIMESTAMP
        });
        
        console.log(`User ${userId} left conversation ${conversationId}`);
    };
    componentWillUnmount() {
        const { roomId , conversationId} = this.props.route.params;
        if (roomId) {
            this.cancelDisconnect(roomId);
            this.leaveRoom(roomId);

        }else{
            this.cancelDisconnectConversation(conversationId);
this.handleLeaveChat(conversationId);
        }
    }

    joinRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) + 1;
        });
    };
     handleJoinChat = async (conversationId) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${userId}`);
        
        await conversationRef.update({
            inChat: true,
            lastLeft: null
        });
        
        console.log(`User ${userId} joined conversation ${conversationId}`);
    };
    leaveRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) - 1;
        });
    };

    fetchConversationMessages = (conversationId) => {
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`conversations/${conversationId}/messages`)
            .orderByChild('timestamp') // timestamp alanına göre sıralama
            .on('value', snapshot => {
                var messages = [];
                snapshot.forEach((item) => {
                    messages.push({
                        conversationId: item.val().conversationId,
                        text: item.val().text,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key,
                        read:item.val().read
                    });
                });
                // Tarihe göre sıralama
                messages.sort((a, b) => b.timestamp - a.timestamp);
                
                this.setState({ messages });
            });
    };

    handleSend = async () => {
        const { text } = this.state;
        const { roomId, conversationId } = this.props.route.params;
    
        const user = auth().currentUser;
        const userId = user.uid;
        const userName = user.displayName;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
    
        let newReference;
        let token;
        let read = false;
    
        if (roomId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`messages/${roomId}`).push();
        } else if (conversationId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/messages`).push();
            try {
                const snapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/members`).once('value');
                let otherUser = null;
                snapshot.forEach(childSnapshot => {
                    const userIds = childSnapshot.val();
                    if (userIds !== userId) {
                        otherUser = userIds;
                    }
                });
    
                if (otherUser) {
                    const otherUserSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${otherUser}`).once('value');
                    const otherUserData = otherUserSnapshot.val();
                    if (otherUserData && otherUserData.fcmToken) {
                        token = otherUserData.fcmToken;
    
                        const userStatusSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${otherUser}`).once('value');
                        const userStatus = userStatusSnapshot.val();
    
                        const otherUserLastLeftSnapshot = await firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/conversations/${conversationId}/userStatus/${otherUser}/lastLeft`).once('value');
                        const otherUserLastLeft = otherUserLastLeftSnapshot.val();
    
                        console.log(userStatus);
    
                        if (userStatus && userStatus.inChat) {
                            read = true;
                            token = null; // If the user is in the chat, do not send a notification
                        } else if (timestamp <= otherUserLastLeft) {
                            read = true;
                        }
                    } else {
                        throw new Error('FCM token not found for the other user');
                    }
                } else {
                    throw new Error('Other user not found in the conversation');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    
        let messageData = {
            text: text,
            userId: userId,
            userName: userName,
            timestamp: timestamp
        };
    
        if (conversationId) {
            messageData.read = read; // Sadece conversation için read ekle
        }
    
        newReference.set(messageData).then(() => {
            if (token) {
                fetch('http://192.168.0.23:3000/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        title: `${userName}`,
                        body: text
                    })
                }).then(response => response.json())
                    .then(data => {
                        console.log('Notification sent:', data);
                    }).catch(error => {
                        console.error('Error sending notification:', error);
                    });
            }
            this.setState({ text: '' });
        }).catch((error) => {
            alert("Error! Failed to send message");
            console.error("Error sending message:", error);
        });
    };
    
    

    render() {
        const { text, messages, connectedUserCount } = this.state;
        const { roomId } = this.props.route.params;
        return (
            <SafeAreaView style={{ flex: 1 }}>
                {roomId && (
                    <View style={{ padding: 10, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
                        <Text>Connected Users: {connectedUserCount}</Text>
                    </View>
                )}
                <FlatList
                    inverted
                    ref={(ref) => this.flatListRef = ref}
                    data={messages}
                    style={style.flatlist}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                />
                <View style={style.inputArea}>
                    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                        <TextInput value={text} onChangeText={(text) => this.setState({ text })} style={style.input} placeholder='Write message..'></TextInput>
                        <TouchableOpacity onPress={this.handleSend}>
                            <Icon name={"paper-plane"} size={25} color='#FF8400'></Icon>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    flatlist: {
        flex: 1
    },
    inputArea: {
        padding: 10,
        borderTopColor: '#dedede',
        borderTopWidth: 1
    },
    input: {
        backgroundColor: '#dedede',
        borderRadius: 15,
        paddingLeft: 20,
        flex: 1,
        height: 50,
        marginRight: 20
    },
    send: {
        backgroundColor: '#FF8400',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 8,
    }
});

export default Chat;
