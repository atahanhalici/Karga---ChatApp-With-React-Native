import React, { Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, TextInput, Dimensions, Modal, TouchableWithoutFeedback, FlatList } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import auth from '@react-native-firebase/auth';
import Messages from './Messages';
import Groups from './Groups';
import Rooms from './Rooms';
import Profile from './Profile';
import database from '@react-native-firebase/database';
import firebase from '@react-native-firebase/app';

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedTab: 'Messages',
            searchBarHeight: new Animated.Value(0),
            isSearchBarVisible: false,
            isNotificationMenuVisible: false,
            notifications: [],
        };
    }

    componentDidMount() {
        this.setUserOnline();
        this.setUserOnlineControl();
        this.fetchNotifications();
    }

    setUserOnline = async () => {
        const userId = firebase.auth().currentUser.uid;
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
        await userRef.update({ online: true, lastOnlineTime: null });
    }

    setUserOnlineControl = () => {
        const userId = firebase.auth().currentUser.uid;
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);

        userRef.onDisconnect().update({
            online: false,
            lastOnlineTime: firebase.database.ServerValue.TIMESTAMP
        });
    };

    fetchNotifications = () => {
        const userId = firebase.auth().currentUser.uid;
        const notificationsRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/notifications`);

        notificationsRef.on('value', snapshot => {
            const notificationsData = snapshot.val();
            if (notificationsData) {
                const notifications = Object.keys(notificationsData).map(key => ({
                    id: key,
                    ...notificationsData[key],
                }));
                this.setState({ notifications });
            } else {
                this.setState({ notifications: [] });
            }
        });
    }

    handleAccept = async (groupId, userId) => {


        const groupRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/groups/${groupId}`);
        await groupRef.child('members').once('value').then(async (snapshot) => {
            const members = snapshot.val() || [];
            if (!members.includes(userId)) {
                members.push(userId);
                await groupRef.update({ members: members.sort() });
            }
        });

        const userStatusUpdate = {
            [userId]: {
                inChat: false,
                lastLeft: null,
                write: false
            }
        };

        await groupRef.child('userStatus').update(userStatusUpdate);
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);

        // groupId'yi kullanıcı verisine eklemek için
        await userRef.once('value').then(async (snapshot) => {
            const userData = snapshot.val() || {};
            
            // Yeni groupId ve değeri true olarak ekleyin
            const updatedGroups = { ...userData.groups, [groupId]: true };
        
            // Kullanıcı verisini güncelleyin
            await userRef.update({ groups: updatedGroups });
        });
        

        const userRefs = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/notifications`);

        await userRefs.once('value').then(async (snapshot) => {
            const notifications = snapshot.val() || {};
            
            // Eşleşen id'yi bulmak için döngü
            const updates = {};
            
            for (const key in notifications) {
                if (notifications[key].id === groupId) {
                    // Eşleşen nesneyi silmek için key değerini kaydedin
                    updates[key] = null;
                }
            }
            
            // Silme işlemini gerçekleştirin
            if (Object.keys(updates).length > 0) {
                await userRefs.update(updates);
            }
        });


    }

    handleReject = async (groupId, userId) =>{
        const userRefs = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/notifications`);

        await userRefs.once('value').then(async (snapshot) => {
            const notifications = snapshot.val() || {};
            
            // Eşleşen id'yi bulmak için döngü
            const updates = {};
            
            for (const key in notifications) {
                if (notifications[key].id === groupId) {
                    // Eşleşen nesneyi silmek için key değerini kaydedin
                    updates[key] = null;
                }
            }
            
            // Silme işlemini gerçekleştirin
            if (Object.keys(updates).length > 0) {
                await userRefs.update(updates);
            }
        });

    }

    logout = () => {
        auth().signOut().then(() => {
            this.props.navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        });
    }

    handleTabPress = (tab) => {
        this.setState({ selectedTab: tab });
    }

    toggleSearchBar = () => {
        const { isSearchBarVisible, searchBarHeight } = this.state;
        if (isSearchBarVisible) {
            Animated.timing(searchBarHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start(() => this.setState({ isSearchBarVisible: false }));
        } else {
            this.setState({ isSearchBarVisible: true }, () => {
                Animated.timing(searchBarHeight, {
                    toValue: 40,
                    duration: 300,
                    useNativeDriver: false,
                }).start();
            });
        }
    }

    toggleNotificationMenu = () => {
        this.setState({ isNotificationMenuVisible: !this.state.isNotificationMenuVisible });
    }

    closeNotificationMenu = () => {
        this.setState({ isNotificationMenuVisible: false });
    }

    renderContent = () => {
        const { selectedTab } = this.state;
        const { navigation } = this.props;

        switch (selectedTab) {
            case 'Messages':
                return <Messages />;
            case 'Groups':
                return <Groups />;
            case 'Rooms':
                return <Rooms navigation={navigation} />;
            case 'Profile':
                return <Profile />;
            default:
                return null;
        }
    }

    renderNotification = ({ item, index }) => {
        const { notifications } = this.state;
        const userId = firebase.auth().currentUser.uid;
        const isLastItem = index === notifications.length - 1;

        return (
            <View>
                <View style={styles.notification}>
                    {item.notificationType === "group" && (
                        <Text style={styles.notificationText}>
                            <Text style={{ fontWeight: 'bold' }}>{item.senderName}</Text> invites you to join the group <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                        </Text>
                    )}
                    <View style={styles.notificationActions}>
                        <TouchableOpacity style={styles.notificationButton}  onPress={() => this.handleReject(item.id, userId)}>
                            <Text style={styles.notificationButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.notificationButton} onPress={() => this.handleAccept(item.id, userId)}>
                            <Text style={styles.notificationButtonText}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {!isLastItem && <View style={styles.divider} />}
            </View>
        );
    };
    getContainerStyle = () => {
        const { selectedTab } = this.state;
        return {
            backgroundColor: 'white',
            flex: 1,
            borderTopRightRadius: 30,
            borderTopLeftRadius: 30,
            alignItems: 'center',
            paddingTop: selectedTab === 'Profile' ? 0 : 20,
        };
    }
    render() {
        const { selectedTab, searchBarHeight, isSearchBarVisible, isNotificationMenuVisible, notifications } = this.state;
        const hasNotifications = notifications.length > 0;
        return (
            <LinearGradient
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0 }}
                colors={['#FF8400', '#FFA500']}
            >
                <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                    <View style={[styles.header, { marginBottom: isSearchBarVisible ? 0 : 20 }]}>
                        <Text style={styles.title}>Karga</Text>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity onPress={this.toggleNotificationMenu} style={styles.iconButton}>
                                <Icon name={"bell"} size={27} color={"white"} />
                                {hasNotifications && <View style={styles.notificationDot} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={this.toggleSearchBar} style={styles.iconButton}>
                                <Icon name={"search"} size={27} color={"white"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isSearchBarVisible && (
                        <Animated.View style={[styles.searchBar, { height: searchBarHeight }]}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search..."
                                placeholderTextColor="#FF8400"
                            />
                        </Animated.View>
                    )}

                    <View style={styles.tabs}>
                        {['Messages', 'Groups', 'Rooms', 'Profile'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tab,
                                    selectedTab === tab && styles.selectedTab
                                ]}
                                onPress={() => this.handleTabPress(tab)}
                            >
                                <Text style={[
                                    styles.tabTitle,
                                    selectedTab === tab ? styles.selectedTabTitle : styles.unselectedTabTitle
                                ]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={this.getContainerStyle()}>
                    {this.renderContent()}
                </View>

                <Modal
                    transparent={true}
                    animationType="fade"
                    visible={isNotificationMenuVisible}
                    onRequestClose={this.closeNotificationMenu}
                >
                    <TouchableWithoutFeedback onPress={this.closeNotificationMenu}>
                        <View style={styles.modalOverlay} />
                    </TouchableWithoutFeedback>
                    <View style={styles.notificationMenu}>
                        <Text style={styles.notificationMenuTitle}>Notifications</Text>
                        {notifications.length === 0 ? (
                            <Text style={styles.noNotificationsText}>No notifications at the moment</Text>
                        ) : (
                            <FlatList
                                data={notifications}
                                renderItem={this.renderNotification}
                                keyExtractor={item => item.id}
                            />
                        )}
                    </View>
                </Modal>
            </LinearGradient>
        );
    }
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 27, fontWeight: '800', color: 'white' },
    headerIcons: { flexDirection: 'row' },
    iconButton: { marginLeft: 15 },
    notificationDot: {
        position: 'absolute',
        top: 0,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
    },
    searchBar: {
        backgroundColor: 'white',
        marginVertical: 10,
        borderColor: '#FF8400',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        alignSelf: 'center',
        justifyContent: 'center',
        width: Dimensions.get('window').width - 30,
    },
    searchInput: {
        color: '#FF8400',
        flex: 1,
    },
    tabs: { flexDirection: 'row', justifyContent: 'space-around' },
    tab: {
        backgroundColor: 'transparent',
        flex: 1,
        marginHorizontal: 8,
        borderRadius: 20,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedTab: {
        backgroundColor: 'white',
    },
    tabTitle: { fontWeight: '600' },
    selectedTabTitle: { color: '#FF8400' },
    unselectedTabTitle: { color: 'white' },

    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
    },
    notificationMenu: {
        position: 'absolute',
        top: 80,
        right: 15,
        backgroundColor: 'white',
        borderRadius: 10,
        width: 250,
        maxHeight: Dimensions.get('window').height * 0.4, // Max height of 40% of screen height
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
    },
    notificationMenuTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
        marginTop: 5
    },
    notification: {
        padding: 15,
    },
    notificationText: {
        fontSize: 16,
        marginBottom: 10,
    },
    notificationActions: {
        flexDirection: 'row',
        justifyContent:'flex-end',
    },
    notificationButton: {
        backgroundColor: '#FF8400',
        borderRadius: 5,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginLeft:5
    },
    notificationButtonText: {
        color: 'white',
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 5,
    },
    noNotificationsText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#888',
        paddingBottom:15
    },
});

export default Home;
