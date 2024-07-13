import React, { Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, TextInput, Dimensions } from 'react-native';
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
        };
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

    render() {
        //this.logout();
        const { selectedTab, searchBarHeight, isSearchBarVisible } = this.state;
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
                        <TouchableOpacity onPress={this.toggleSearchBar}>
                            <Icon name={"search"} size={27} color={"white"} />
                        </TouchableOpacity>
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
                <View style={styles.container}>
                    {this.renderContent()}
                </View>
            </LinearGradient>
        );
    }
}

const styles = StyleSheet.create({
    background: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', },
    title: { fontSize: 27, fontWeight: '800', color: 'white' },
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
    container: {
        backgroundColor: 'white',
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        alignItems: 'center',
        paddingTop: 20,
    },
});

export default Home;
