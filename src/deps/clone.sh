#!/bin/bash

function git_update_checker() {
	repo="$1"
	commit="$2"
	main_tmp_folder="/tmp/bunkerweb"
	mkdir -p "${main_tmp_folder}"
	echo "ℹ️ Check updates for ${repo}"
	folder="$(echo "$repo" | sed -E "s@https://github.com/.*/(.*)\.git@\1@")"
	output="$(git clone "$repo" "${main_tmp_folder}/${folder}" 2>&1)"
	if [ $? -ne 0 ] ; then
		echo "❌ Error cloning $1"
		echo "$output"
		rm -rf "${main_tmp_folder}/${folder}" || true
		return
	fi
	old_dir="$(pwd)"
	cd "${main_tmp_folder}/${folder}"
	output="$(git checkout "${commit}^{commit}" 2>&1)"
	if [ $? -ne 0 ] ; then
		echo "❌ Commit hash $commit is absent from repository $repo"
		echo "$output"
		rm -rf "${main_tmp_folder}/${folder}" || true
		cd "$old_dir"
		return
	fi
	output="$(git fetch 2>&1)"
	if [ $? -ne 0 ] ; then
		echo "⚠️ Upgrade version checker error on $repo"
		echo "$output"
		rm -rf "${main_tmp_folder}/${folder}" || true
		cd "$old_dir"
		return
	fi
	latest_tag=$(git describe --tags `git rev-list --tags --max-count=1`)
	if [ $? -ne 0 ] ; then
		echo "⚠️ Upgrade version checker error on getting latest tag $repo"
		echo "$latest_tag"
		rm -rf "${main_tmp_folder}/${folder}" || true
		cd "$old_dir"
		return
	fi
	latest_release=$(curl --silent "https://api.github.com/repos/$full_name_repo/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
	if [ $? -ne 0 ] ; then
		echo "⚠️ Upgrade version checker error on getting latest release $repo"
		echo "$latest_release"
		rm -fr "${main_tmp_folder}/${folder}" || true
		cd "$old_dir"
		return
	fi
	current_tag=$(git describe --tags)
	if [[ ! -z "$latest_tag" ]] && [[ "$current_tag" != *"$latest_tag"* ]]; then
		echo "⚠️ ️Update checker: new tag found: $latest_tag, current tag/release: $current_tag, please update"
	fi
	if [[ ! -z "$latest_release" ]] && [[ "$current_tag" != *"$latest_release"* ]]; then
		echo "⚠️ ️Update checker: new tag found: $latest_release, current tag/release: $current_tag, please update"
	fi
	rm -rf "${main_tmp_folder}/${folder}" || true
	cd "$old_dir"
}

function git_secure_clone() {
	repo="$1"
	commit="$2"
	folder="$(echo "$repo" | sed -E "s@https://github.com/.*/(.*)\.git@\1@")"
	if [ ! -d "deps/src/${folder}" ] ; then
		output="$(git clone "$repo" "deps/src/${folder}")"
		if [ $? -ne 0 ] ; then
			echo "❌ Error cloning $1"
			echo "$output"
			exit 1
		fi
		old_dir="$(pwd)"
		cd "deps/src/${folder}"
		output="$(git checkout "${commit}^{commit}" 2>&1)"
		if [ $? -ne 0 ] ; then
			echo "❌ Commit hash $commit is absent from repository $repo"
			echo "$output"
			exit 1
		fi
		cd "$old_dir"
		output="$(rm -rf "deps/src/${folder}/.git")"
		if [ $? -ne 0 ] ; then
			echo "❌ Can't delete .git from repository $repo"
			echo "$output"
			exit 1
		fi
	else
		echo "⚠️ Skipping clone of $repo because target directory is already present"
		git_update_checker $repo $commit
	fi
}

function secure_download() {
	link="$1"
	file="$2"
	hash="$3"
	dir="$(echo $file | sed 's/.tar.gz//g')"
	if [ ! -d "deps/src/${dir}" ] ; then
		output="$(wget -q -O "deps/src/${file}" "$link" 2>&1)"
		if [ $? -ne 0 ] ; then
			echo "❌ Error downloading $link"
			echo "$output"
			exit 1
		fi
		check="$(sha512sum "deps/src/${file}" | cut -d ' ' -f 1)"
		if [ "$check" != "$hash" ] ; then
			echo "❌️ Wrong hash from file $link (expected $hash got $check)"
			exit 1
		fi
	else
		echo "⚠️ Skipping download of $link because target directory is already present"
	fi
}

function do_and_check_cmd() {
	if [ "$CHANGE_DIR" != "" ] ; then
		cd "$CHANGE_DIR"
	fi
	output=$("$@" 2>&1)
	ret="$?"
	if [ $ret -ne 0 ] ; then
		echo "❌ Error from command : $*"
		echo "$output"
		exit $ret
	fi
	#echo $output
	return 0
}

# nginx 1.24.0
echo "ℹ️ Downloading nginx"
NGINX_VERSION="1.24.0"
secure_download "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" "nginx-${NGINX_VERSION}.tar.gz" "1114e37de5664a8109c99cfb2faa1f42ff8ac63c932bcf3780d645e5ed32c0b2ac446f80305b4465994c8f9430604968e176ae464fd80f632d1cb2c8f6007ff3"
if [ -f "deps/src/nginx-${NGINX_VERSION}.tar.gz" ] ; then
	do_and_check_cmd tar -xvzf deps/src/nginx-${NGINX_VERSION}.tar.gz -C deps/src
	do_and_check_cmd rm -f deps/src/nginx-${NGINX_VERSION}.tar.gz
fi

# Lua 5.1.5
echo "ℹ️ Downloading Lua"
LUA_VERSION="5.1.5"
secure_download "https://www.lua.org/ftp/lua-${LUA_VERSION}.tar.gz" "lua-${LUA_VERSION}.tar.gz" "0142fefcbd13afcd9b201403592aa60620011cc8e8559d4d2db2f92739d18186860989f48caa45830ff4f99bfc7483287fd3ff3a16d4dec928e2767ce4d542a9"
if [ -f "deps/src/lua-${LUA_VERSION}.tar.gz" ] ; then
	do_and_check_cmd tar -xvzf deps/src/lua-${LUA_VERSION}.tar.gz -C deps/src
	do_and_check_cmd rm -f deps/src/lua-${LUA_VERSION}.tar.gz
	do_and_check_cmd patch deps/src/lua-${LUA_VERSION}/Makefile deps/misc/lua.patch1
	do_and_check_cmd patch deps/src/lua-${LUA_VERSION}/src/Makefile deps/misc/lua.patch2
fi

# lua-resty-ipmatcher v0.6.1 (3 commits after just in case)
echo "ℹ️ Downloading lua-resty-ipmatcher"
dopatch="no"
if [ ! -d "deps/src/lua-resty-ipmatcher" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/api7/lua-resty-ipmatcher.git" "7fbb618f7221b1af1451027d3c64e51f3182761c"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd patch deps/src/lua-resty-ipmatcher/resty/ipmatcher.lua deps/misc/ipmatcher.patch
fi

# luajit-geoip v2.1.0
echo "ℹ️ Downloading luajit-geoip"
dopatch="no"
if [ ! -d "deps/src/luajit-geoip" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/leafo/luajit-geoip.git" "12a9388207f40c37ad5cf6de2f8e0cc72bf13477"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd patch deps/src/luajit-geoip/geoip/mmdb.lua deps/misc/mmdb.patch
fi

# lua-pack v2.0.0
echo "ℹ️ Downloading lua-pack"
dopatch="no"
if [ ! -d "deps/src/lua-pack" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/Kong/lua-pack.git" "495bf30606b9744140258df349862981e3ee7820"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd cp deps/misc/lua-pack.Makefile deps/src/lua-pack/Makefile
fi

# lua-resty-openssl v0.8.22
echo "ℹ️ Downloading lua-resty-openssl"
dopatch="no"
if [ ! -d "deps/src/lua-resty-openssl" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/fffonion/lua-resty-openssl.git" "484907935e60273d31626ac849b23a2d218173de"
if [ "$dopatch" == "yes" ] ; then
	do_and_check_cmd rm -r deps/src/lua-resty-openssl/t
fi

# lua-ffi-zlib v0.5.0
echo "ℹ️ Downloading lua-ffi-zlib"
dopatch="no"
if [ ! -d "deps/src/lua-ffi-zlib" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/hamishforbes/lua-ffi-zlib.git" "1fb69ca505444097c82d2b72e87904f3ed923ae9"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd patch deps/src/lua-ffi-zlib/lib/ffi-zlib.lua deps/misc/lua-ffi-zlib.patch
fi

# lua-resty-signal v0.03
echo "ℹ️ Downloading lua-resty-signal"
git_secure_clone "https://github.com/openresty/lua-resty-signal.git" "d07163e8cfa673900e66048cd2a1f18523aecf16"

# ModSecurity v3.0.9
echo "ℹ️ Downloading ModSecurity"
dopatch="no"
if [ ! -d "deps/src/ModSecurity" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/SpiderLabs/ModSecurity.git" "205dac0e8c675182f96b5c2fb06be7d1cf7af2b2"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd patch deps/src/ModSecurity/configure.ac deps/misc/modsecurity.patch
fi

# libinjection v3.10.0+
# TODO: check if the latest commit is fine
echo "ℹ️ Downloading libinjection"
git_secure_clone "https://github.com/libinjection/libinjection.git" "49904c42a6e68dc8f16c022c693e897e4010a06c"
do_and_check_cmd cp -r deps/src/libinjection deps/src/ModSecurity/others

# ModSecurity-nginx v1.0.3
echo "ℹ️ Downloading ModSecurity-nginx"
dopatch="no"
if [ ! -d "deps/src/ModSecurity-nginx" ] ; then
	dopatch="yes"
fi
git_secure_clone "https://github.com/SpiderLabs/ModSecurity-nginx.git" "d59e4ad121df702751940fd66bcc0b3ecb51a079"
if [ "$dopatch" = "yes" ] ; then
	do_and_check_cmd patch deps/src/ModSecurity-nginx/src/ngx_http_modsecurity_log.c deps/misc/modsecurity-nginx.patch
	do_and_check_cmd patch deps/src/ModSecurity-nginx/config deps/misc/config.patch
	do_and_check_cmd patch deps/src/ModSecurity-nginx/src/ngx_http_modsecurity_common.h deps/misc/ngx_http_modsecurity_common.h.patch
	do_and_check_cmd patch deps/src/ModSecurity-nginx/src/ngx_http_modsecurity_module.c deps/misc/ngx_http_modsecurity_module.c.patch
	do_and_check_cmd cp deps/misc/ngx_http_modsecurity_access.c deps/src/ModSecurity-nginx/src
fi
